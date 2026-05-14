from datetime import datetime

class AIContentContract:

    def validate_prompt(self, prompt: str):
        banned_words = [
            "scam",
            "illegal",
            "fraud",
            "hate"
        ]

        detected = []

        for word in banned_words:
            if word.lower() in prompt.lower():
                detected.append(word)

        if detected:
            return {
                "approved": False,
                "reason": f"Blocked keywords: {', '.join(detected)}",
                "timestamp": str(datetime.utcnow())
            }

        return {
            "approved": True,
            "credits_required": 10,
            "timestamp": str(datetime.utcnow())
        }

    def authorize_generation(self, user_credits: int):
        if user_credits < 10:
            return {
                "success": False,
                "message": "Insufficient credits"
            }

        return {
            "success": True,
            "remaining_estimate": user_credits - 10
        }