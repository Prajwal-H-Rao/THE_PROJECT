"""
Nova design system - Model category suggester (task 11.7, module 11).
Pure Python function that suggests a category with confidence and reason
for a transaction, mirroring what the model-gateway returns for a
model-drafted category. No Flask, no pg, no credentials (Spec:741).
Integer minor units are not involved here (category strings only).
Spec:190 - categorize only, no movement of money.
"""


# Purpose: map a merchant/description to a suggested category with a
# confidence and reason. Deterministic: same input always yields the same
# suggestion, mirroring a model's output.
def suggest_category(merchant: str, description: str, model_id: str) -> dict:
    text = f"{merchant} {description}".lower()

    categories = [
        ("grocery", ["grocery", "supermarket", "whole foods", "trader joes"],
         "Food", 0.9, "Merchant is a grocery store"),
        ("fuel", ["shell", "bp", "exxon", "chevron", "gas", "petrol"],
         "Transport", 0.85, "Merchant is a fuel station"),
        ("coffee", ["starbucks", "coffee", "cafe"],
         "Cafe", 0.8, "Merchant is a coffee shop"),
        ("uber", ["uber", "lyft", "taxi"],
         "Transport", 0.9, "Merchant is a ride-hailing service"),
        ("amazon", ["amazon"],
         "Shopping", 0.85, "Merchant is an online retailer"),
    ]

    for _key, keywords, category, confidence, reason in categories:
        for keyword in keywords:
            if keyword in text:
                return {
                    "category": category,
                    "confidence": confidence,
                    "reason": reason,
                    "model_id": model_id,
                }

    return {
        "category": "uncategorised",
        "confidence": 0.0,
        "reason": "No matching category keyword found",
        "model_id": model_id,
    }
