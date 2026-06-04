from fastapi import APIRouter
from app.services.embedding_service import embed_job
from app.services.storage_service import save_job, load_jobs

router = APIRouter()

job_store = load_jobs()


@router.post("/create")
def create_job(job_text: str):
    embedding = embed_job(job_text)

    job_data = {
        "id": len(job_store),
        "text": job_text,
        "embedding": embedding
    }

    job_store.append(job_data)
    save_job(job_data)

    return {
        "message": "Job created",
        "job_id": job_data["id"]
    }


@router.get("/")
def get_all_jobs():
    return job_store