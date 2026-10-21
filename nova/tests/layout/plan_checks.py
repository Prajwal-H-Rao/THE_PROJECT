"""Check the citations of the build plan. Verify that every quote still sits on its spec line."""

import re

# The citation forms that the plan uses.
CITE = re.compile(r"[Ss]pec:(\d+)")
RANGE = re.compile(r"[Ss]pec:(\d+)-(\d+)")

# The quoted strings that the plan attributes to the spec.
QUOTE = re.compile(r"\"([^\"]{20,})\"")

# The words that a quote holds.
WORD = re.compile(r"[A-Za-z][A-Za-z0-9'\-]{2,}")

# The count that a plan line states next to a range.
COUNT = re.compile(r"\b(\d+)\s+(rows|steps|items|entries|services|invariants|labs|entities|units)\b")

# The count words that a plan line states next to a range.
COUNT_WORDS = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
    "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
    "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
}


def spec_lines(spec_path):
    """Return the lines of the spec."""
    return spec_path.read_text(encoding="utf-8").splitlines()


def cited_numbers(text):
    """Return every spec line number that the text cites."""
    numbers = [int(value) for value in CITE.findall(text)]
    for first, last in RANGE.findall(text):
        numbers.extend(range(int(first), int(last) + 1))
    return sorted(set(numbers))


def holds_in_order(quote, line):
    """Return True when the words of the quote sit on the line in the same order."""
    wanted = [word.lower() for word in WORD.findall(quote)]
    if not wanted:
        return True
    available = [word.lower() for word in WORD.findall(line)]
    index = 0
    for word in wanted:
        while index < len(available) and available[index] != word:
            index += 1
        if index == len(available):
            return False
        index += 1
    return True


def stated_count(text):
    """Return the count that the plan line states, or None."""
    match = COUNT.search(text)
    if match:
        return int(match.group(1))
    for word, value in COUNT_WORDS.items():
        if re.search(r"\b" + word + r"\b\s+(rows|steps|items|entries|services|invariants|labs|entities|units)\b", text):
            return value
    return None


def range_problems(text, path_name, number):
    """Return the problems of a range citation whose length contradicts the stated count."""
    problems = []
    ranges = [(match.start(), int(match.group(1)), int(match.group(2)))
              for match in RANGE.finditer(text)]
    for match in COUNT.finditer(text):
        count = int(match.group(1))
        following = [item for item in ranges if item[0] > match.start()]
        if not following:
            continue
        _start, first, last = following[0]
        if last - first + 1 != count:
            problems.append("%s line %d states %d and the range holds %d" % (
                path_name, number, count, last - first + 1))
    for word, value in COUNT_WORDS.items():
        pattern = re.compile(
            r"\b" + word + r"\b\s+(rows|steps|items|entries|services|invariants|labs|entities|units)\b")
        for match in pattern.finditer(text):
            following = [item for item in ranges if item[0] > match.start()]
            if not following:
                continue
            _start, first, last = following[0]
            if last - first + 1 != value:
                problems.append("%s line %d states %d and the range holds %d" % (
                    path_name, number, value, last - first + 1))
    return problems


def check_plan_citations(plan_dir, spec_path):
    """Check that every plan citation resolves and every quote still sits on its line."""
    lines = spec_lines(spec_path)
    problems = []
    for path in sorted(plan_dir.glob("*.md")):
        for number, text in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            cited = cited_numbers(text)
            for value in cited:
                if value < 1 or value > len(lines):
                    problems.append("%s line %d cites spec:%d and the spec has no such line" % (
                        path.name, number, value))
            for quote in QUOTE.findall(text):
                if not cited:
                    continue
                if not any(holds_in_order(quote, lines[value - 1]) for value in cited
                           if 1 <= value <= len(lines)):
                    problems.append("%s line %d quotes text that spec:%s does not hold" % (
                        path.name, number, ", ".join(str(value) for value in cited)))
            problems += range_problems(text, path.name, number)
    if problems:
        return "; ".join(problems[:20])
    return None
