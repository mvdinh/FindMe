def preprocess_text(text: str):
    text = text.lower()

    text = text.replace("\n", " ")

    text = " ".join(text.split())

    return text