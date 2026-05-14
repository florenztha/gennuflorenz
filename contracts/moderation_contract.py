class ModerationContract:

    def check_content(self, text: str):

        restricted = [
            "violence",
            "terrorism",
            "exploit"
        ]

        found = []

        for item in restricted:
            if item in text.lower():
                found.append(item)

        return {
            "safe": len(found) == 0,
            "detected": found
        }