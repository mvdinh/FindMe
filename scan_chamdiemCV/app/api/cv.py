from fastapi import APIRouter, UploadFile, File
from app.services.pdf_service import extract_text
from app.services.embedding_service import embed_cv
from app.services.storage_service import save_cv, load_cvs

router = APIRouter()

cv_store = load_cvs()


@router.post("/upload")
async def upload_cv(file: UploadFile = File(...)):
    content = await file.read()

    text = extract_text(content)
    embedding = embed_cv(text)

    cv_data = {
        "id": len(cv_store),
        "text": text,
        "embedding": embedding
    }

    cv_store.append(cv_data)
    save_cv(cv_data)

    return {
        "message": "CV uploaded",
        "cv_id": cv_data["id"]
    }


@router.get("/")
def get_all_cvs():
    return cv_store