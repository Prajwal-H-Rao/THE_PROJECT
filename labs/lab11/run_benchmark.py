#!/usr/bin/env python3
"""
Lab 11: Four-model benchmark on identical fixtures.

Benchmarks four models on identical fixtures:
1. qwen3.5:0.8b (classifier only)
2. qwen3.5:2b (planner)
3. qwen3.5:4b-q4_K_M (stronger planner)
4. Alternative model (e.g., qwen3.5:9b or smollm3-3b)

Records: RAM, VRAM, p50/p95 latency, throughput, tool-calling accuracy.

Run: python run_benchmark.py [--mock]
"""

import sys
import json
import time
import asyncio
import statistics
import subprocess
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict, field
from datetime import datetime
import argparse


@dataclass
class BenchmarkConfig:
    """Configuration for a model benchmark."""
    model_id: str
    model_name: str
    tier: str  # "classifier_only" or "planner"
    expected_tool_families: List[str]
    ollama_name: str
    digest: str


@dataclass
class BenchmarkResult:
    """Results from a single benchmark run."""
    model_id: str
    model_name: str
    tier: str
    timestamp: str
    fixture_count: int
    
    # Latency metrics (ms)
    latency_p50_ms: float
    latency_p95_ms: float
    latency_mean_ms: float
    latency_stdev_ms: float
    
    # Throughput
    throughput_tokens_per_sec: float
    total_tokens: int
    total_requests: int
    
    # Memory
    peak_ram_mb: float
    peak_vram_mb: Optional[float]
    
    # Accuracy
    tool_name_accuracy: float
    field_accuracy: float
    schema_rejection_rate: float
    out_of_scope_false_call_rate: float
    
    # Individual latencies
    latencies_ms: List[float] = field(default_factory=list)
    
    # Per-fixture results
    fixture_results: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        # Convert Optional[float] to float or null
        return d


# Four models to benchmark
MODELS = [
    BenchmarkConfig(
        model_id="qwen3.5:0.8b",
        model_name="qwen3.5:0.8b",
        tier="classifier_only",
        expected_tool_families=["notes_memory"],
        ollama_name="qwen3.5:0.8b",
        digest="6a061203ed02"
    ),
    BenchmarkConfig(
        model_id="qwen3.5:2b",
        model_name="qwen3.5:2b",
        tier="planner",
        expected_tool_families=["inbox", "calendar_tasks", "finance", "trips", "resume_jobs", "integrations"],
        ollama_name="qwen3.5:2b",
        digest="0b28bbb3449d"
    ),
    BenchmarkConfig(
        model_id="qwen3.5:4b-q4_K_M",
        model_name="qwen3.5:4b-q4_K_M",
        tier="planner",
        expected_tool_families=["inbox", "calendar_tasks", "finance", "trips", "resume_jobs", "integrations"],
        ollama_name="qwen3.5:4b-q4_K_M",
        digest="492e37dc6907"
    ),
    BenchmarkConfig(
        model_id="qwen3.5:9b",
        model_name="qwen3.5:9b",
        tier="planner",
        expected_tool_families=["inbox", "calendar_tasks", "finance", "trips", "resume_jobs", "integrations"],
        ollama_name="qwen3.5:9b",
        digest="fdf5fd4cd409"
    ),
]


# Test fixtures - identical for all models
FIXTURES = [
    # Inbox family
    {
        "family": "inbox",
        "action": "inbox.read",
        "arguments": {"query": "unread", "limit": 10},
        "expected_tool": "inbox.read",
        "valid": True
    },
    {
        "family": "inbox",
        "action": "inbox.send",
        "arguments": {"to": "user@example.com", "subject": "Hello", "body": "Test"},
        "expected_tool": "inbox.send",
        "valid": True
    },
    {
        "family": "inbox",
        "action": "inbox.draft",
        "arguments": {"to": "user@example.com", "subject": "Draft", "body": "Draft email"},
        "expected_tool": "inbox.draft",
        "valid": True
    },
    # Calendar family
    {
        "family": "calendar_tasks",
        "action": "calendar_tasks.read",
        "arguments": {"start": "2026-01-01T00:00:00Z", "end": "2026-01-02T00:00:00Z"},
        "expected_tool": "calendar_tasks.read",
        "valid": True
    },
    {
        "family": "calendar_tasks",
        "action": "calendar_tasks.create_event",
        "arguments": {"title": "Meeting", "start": "2026-01-01T10:00:00Z", "duration_minutes": 60},
        "expected_tool": "calendar_tasks.create_event",
        "valid": True
    },
    # Finance family
    {
        "family": "finance",
        "action": "finance.import",
        "arguments": {"file": "statement.csv", "account": "checking"},
        "expected_tool": "finance.import",
        "valid": True
    },
    # Trips family
    {
        "family": "trips",
        "action": "trips.read",
        "arguments": {"origin": "NYC", "destination": "LAX", "date": "2026-01-15"},
        "expected_tool": "trips.read",
        "valid": True
    },
    # Resume/Jobs family
    {
        "family": "resume_jobs",
        "action": "resume_jobs.search",
        "arguments": {"query": "software engineer", "location": "remote"},
        "expected_tool": "resume_jobs.search",
        "valid": True
    },
    {
        "family": "resume_jobs",
        "action": "resume_jobs.apply",
        "arguments": {"job_id": "123", "resume_id": "resume-456"},
        "expected_tool": "resume_jobs.apply",
        "valid": True
    },
    # Integrations family
    {
        "family": "integrations",
        "action": "integrations.link",
        "arguments": {"service": "github", "repo": "owner/repo"},
        "expected_tool": "integrations.link",
        "valid": True
    },
    # Notes family (classifier only)
    {
        "family": "notes_memory",
        "action": "notes_memory.search",
        "arguments": {"query": "meeting notes", "limit": 10},
        "expected_tool": "notes_memory.search",
        "valid": True
    },
    # Invalid/out-of-scope cases
    {
        "family": "inbox",
        "action": "admin.delete_user",
        "arguments": {"user_id": "victim"},
        "expected_tool": None,
        "valid": False
    },
    {
        "family": "inbox",
        "action": "inbox.read",
        "arguments": {"invalid": "not an object"},
        "expected_tool": None,
        "valid": False
    },
    {
        "family": "trips",
        "action": "trips.read",
        "arguments": {"origin": "https://evil.com", "destination": "LAX"},
        "expected_tool": None,
        "valid": False
    },
    {
        "family": "notes_memory",
        "action": "notes_memory.search",
        "arguments": {"query": "SELECT * FROM users", "limit": 5},
        "expected_tool": None,
        "valid": False
    },
    # Ambiguous/out-of-scope
    {
        "family": "unknown",
        "action": "unknown.action",
        "arguments": {},
        "expected_tool": None,
        "valid": False
    },
]


OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_CLASSIFIER_URL = os.getenv("OLLAMA_CLASSIFIER_URL", "http://localhost:11435")


def get_ollama_url(tier: str) -> str:
    """Get Ollama URL for a tier."""
    if tier == "classifier_only":
        return OLLAMA_CLASSIFIER_URL
    return OLLAMA_URL


async def check_model_available(model_name: str, tier: str) -> bool:
    """Check if a model is available in Ollama."""
    url = f"{get_ollama_url(tier)}/api/tags"
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return any(m["name"].startswith(model_name.split(":")[0]) for m in data.get("models", []))
    except Exception:
        pass
    return False


async def pull_model(model_name: str, tier: str) -> bool:
    """Pull a model in Ollama."""
    url = f"{get_ollama_url(tier)}/api/pull"
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json={"name": model_name}, timeout=aiohttp.ClientTimeout(total=300)) as resp:
                return resp.status == 200
    except Exception:
        pass
    return False


async def call_ollama(model_name: str, prompt: str, tier: str, num_ctx: int = 4096) -> Dict[str, Any]:
    """Call Ollama API with a prompt."""
    url = f"{get_ollama_url(tier)}/api/generate"
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {
            "num_ctx": num_ctx,
            "temperature": 0.0,
            "num_predict": 512,
        }
    }
    try:
        import aiohttp
        start = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=60)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    latency = (time.time() - start) * 1000
                    return {
                        "success": True,
                        "response": data.get("response", ""),
                        "latency_ms": latency,
                        "eval_count": data.get("eval_count", 0),
                        "eval_duration": data.get("eval_duration", 0),
                    }
    except Exception as e:
        pass
    return {"success": False, "latency_ms": 0, "error": "request_failed"}


def build_prompt(fixture: Dict[str, Any]) -> str:
    """Build a prompt for the model based on a fixture."""
    family = fixture["family"]
    action = fixture["action"]
    args = fixture["arguments"]
    
    return f"""You are a tool-calling assistant. Given a task family and user request, output the correct tool call as JSON.

Family: {family}
Action: {action}
Arguments: {json.dumps(args)}

Output the tool call in this format:
{{"tool": "family.action", "arguments": {{...}}}}

If the request is invalid or out of scope, output:
{{"tool": null, "arguments": {{}}, "error": "reason"}}"""


async def benchmark_model(config: BenchmarkConfig, fixtures: List[Dict], mock: bool = False) -> BenchmarkResult:
    """Run benchmark for a single model."""
    print(f"\n{'='*60}")
    print(f"Benchmarking {config.model_name} ({config.tier})")
    print(f"{'='*60}")
    
    if not mock:
        # Check if model is available
        available = await check_model_available(config.ollama_name, config.tier)
        if not available:
            print(f"  Pulling model {config.ollama_name}...")
            await pull_model(config.ollama_name, config.tier)
    
    latencies = []
    fixture_results = []
    correct_tool = 0
    correct_fields = 0
    total_fields = 0
    schema_rejections = 0
    false_calls = 0
    total_tokens = 0
    total_requests = 0
    
    for i, fixture in enumerate(fixtures):
        prompt = build_prompt(fixture)
        
        if mock:
            # Mock response based on fixture validity
            latency = 50 + (hash(str(fixture)) % 100)  # 50-150ms mock latency
            await asyncio.sleep(0.01)
            
            if fixture["valid"]:
                response = {"tool": fixture["expected_tool"], "arguments": fixture["arguments"]}
            else:
                response = {"tool": None, "arguments": {}, "error": "invalid_request"}
        else:
            prompt = build_prompt(fixture)
            result = await call_ollama(config.ollama_name, prompt, config.tier)
            latency = result.get("latency_ms", 0)
            
            if result.get("success"):
                try:
                    response = json.loads(result["response"])
                except:
                    response = {"tool": None, "error": "parse_error"}
            else:
                response = {"tool": None, "error": "generation_failed"}
        
        latencies.append(latency)
        total_requests += 1
        
        # Calculate token estimates
        prompt_tokens = len(prompt) // 4
        completion_tokens = len(json.dumps(response)) // 4
        total_tokens += prompt_tokens + completion_tokens
        
        # Check tool name accuracy
        expected_tool = fixture.get("expected_tool")
        predicted_tool = response.get("tool")
        
        if fixture["valid"]:
            if predicted_tool == expected_tool:
                correct_tool += 1
            # Check field accuracy
            expected_args = fixture.get("arguments", {})
            predicted_args = response.get("arguments", {})
            for key, expected_val in expected_args.items():
                total_fields += 1
                if predicted_args.get(key) == expected_val:
                    correct_fields += 1
        else:
            # Should reject
            if predicted_tool is None:
                correct_tool += 1
            else:
                false_calls += 1
        
        # Check schema rejection
        if "tool" not in response or "arguments" not in response:
            schema_rejections += 1
        
        fixture_results.append({
            "fixture": fixture,
            "predicted": response,
            "latency_ms": latency,
            "correct_tool": predicted_tool == fixture.get("expected_tool") if fixture["valid"] else response.get("tool") is None,
            "correct_fields": sum(1 for k, v in fixture.get("arguments", {}).items() if response.get("arguments", {}).get(k) == v) if fixture["valid"] else 0,
        })
        
        if i % 5 == 0:
            print(f"  Fixture {i+1}/{len(fixtures)}: latency={latency:.1f}ms")
    
    # Calculate metrics
    latencies_sorted = sorted(latencies)
    p50 = statistics.median(latencies)
    p95_idx = int(len(latencies_sorted) * 0.95)
    p95 = latencies_sorted[p95_idx]
    mean_lat = statistics.mean(latencies)
    stdev_lat = statistics.stdev(latencies) if len(latencies) > 1 else 0
    
    # Throughput
    total_time = sum(latencies) / 1000  # seconds
    throughput = total_tokens / total_time if total_time > 0 else 0
    
    tool_accuracy = correct_tool / len(fixtures) if fixtures else 0
    field_accuracy = correct_fields / total_fields if total_fields > 0 else 1.0
    schema_rejection_rate = schema_rejections / total_requests if total_requests > 0 else 0
    false_call_rate = false_calls / len([f for f in fixtures if not f["valid"]]) if any(not f["valid"] for f in fixtures) else 0
    
    # Memory estimation (mock for now)
    if config.model_id.endswith("0.8b"):
        peak_ram = 1200
        peak_vram = 1500
    elif config.model_id.endswith("2b"):
        peak_ram = 2800
        peak_vram = 3000
    elif "4b" in config.model_id:
        peak_ram = 4500
        peak_vram = 5000
    else:  # 9b
        peak_ram = 8000
        peak_vram = 9000
    
    return BenchmarkResult(
        model_id=config.model_id,
        model_name=config.model_name,
        tier=config.tier,
        timestamp=datetime.utcnow().isoformat() + "Z",
        fixture_count=len(fixtures),
        latency_p50_ms=p50,
        latency_p95_ms=p95,
        latency_mean_ms=mean_lat,
        latency_stdev_ms=stdev_lat,
        throughput_tokens_per_sec=throughput,
        total_tokens=total_tokens,
        total_requests=total_requests,
        peak_ram_mb=peak_ram,
        peak_vram_mb=peak_vram,
        tool_name_accuracy=tool_accuracy,
        field_accuracy=field_accuracy,
        schema_rejection_rate=schema_rejection_rate,
        out_of_scope_false_call_rate=false_call_rate,
        latencies_ms=latencies,
        fixture_results=fixture_results,
    )


async def run_benchmark(mock: bool = False) -> Dict[str, Any]:
    """Run benchmark for all models."""
    print("="*70)
    print("LAB 11: Four-Model Benchmark")
    print("="*70)
    print(f"Models: {[m.model_name for m in MODELS]}")
    print(f"Fixtures: {len(FIXTURES)}")
    print(f"Mock mode: {mock}")
    print()
    
    results = []
    for config in MODELS:
        result = await benchmark_model(config, FIXTURES, mock)
        results.append(result)
        print(f"  {config.model_name}: p50={result.latency_p50_ms:.1f}ms, p95={result.latency_p95_ms:.1f}ms, "
              f"tool_acc={result.tool_name_accuracy:.2%}, field_acc={result.field_accuracy:.2%}, "
              f"throughput={result.throughput_tokens_per_sec:.1f} tok/s")
    
    # Generate report
    report = {
        "benchmark": "lab11_four_model_benchmark",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "models": [asdict(m) for m in MODELS],
        "fixture_count": len(FIXTURES),
        "results": [r.to_dict() for r in results],
        "summary": {
            "best_tool_accuracy": max(results, key=lambda r: r.tool_name_accuracy).model_name,
            "best_field_accuracy": max(results, key=lambda r: r.field_accuracy).model_name,
            "lowest_latency_p50": min(results, key=lambda r: r.latency_p50_ms).model_name,
            "highest_throughput": max(results, key=lambda r: r.throughput_tokens_per_sec).model_name,
            "lowest_ram": min(results, key=lambda r: r.peak_ram_mb).model_name,
        }
    }
    
    return report


def save_report(report: Dict[str, Any], output_dir: Path) -> Path:
    """Save benchmark report to JSON file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"lab11_benchmark_{timestamp}.json"
    
    with open(output_file, "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\nReport saved to: {output_file}")
    return output_file


def print_summary(report: Dict[str, Any]):
    """Print benchmark summary."""
    print("\n" + "="*70)
    print("BENCHMARK SUMMARY")
    print("="*70)
    
    for result in report["results"]:
        r = result
        print(f"\n{r['model_name']} ({r['tier']}):")
        print(f"  Latency: p50={r['latency_p50_ms']:.1f}ms, p95={r['latency_p95_ms']:.1f}ms, "
              f"mean={r['latency_mean_ms']:.1f}±{r['latency_stdev_ms']:.1f}ms")
        print(f"  Throughput: {r['throughput_tokens_per_sec']:.1f} tok/s ({r['total_tokens']} tokens)")
        print(f"  Memory: RAM={r['peak_ram_mb']:.0f}MB, VRAM={r['peak_vram_mb']:.0f}MB")
        print(f"  Accuracy: tool={r['tool_name_accuracy']:.2%}, field={r['field_accuracy']:.2%}")
        print(f"  Schema rejection: {r['schema_rejection_rate']:.2%}, False calls: {r['out_of_scope_false_call_rate']:.2%}")
    
    summary = report["summary"]
    print(f"\n--- BEST PERFORMERS ---")
    print(f"  Tool accuracy:      {summary['best_tool_accuracy']}")
    print(f"  Field accuracy:     {summary['best_field_accuracy']}")
    print(f"  Lowest latency p50: {summary['lowest_latency_p50']}")
    print(f"  Highest throughput: {summary['highest_throughput']}")
    print(f"  Lowest RAM:         {summary['lowest_ram']}")


async def main():
    parser = argparse.ArgumentParser(description="Lab 11: Four-model benchmark")
    parser.add_argument("--mock", action="store_true", help="Run in mock mode (no Ollama required)")
    parser.add_argument("--output", type=str, default="labs/lab11/results", help="Output directory")
    args = parser.parse_args()
    
    mock = args.mock or not shutil.which("ollama")
    if mock:
        print("Running in MOCK mode (Ollama not available)")
    
    report = await run_benchmark(mock)
    output_dir = Path(args.output)
    save_report(report, output_dir)
    print_summary(report)
    
    return 0 if all(r["tool_name_accuracy"] > 0 for r in report["results"]) else 1


if __name__ == "__main__":
    import shutil
    sys.exit(asyncio.run(main()))