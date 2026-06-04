from fastapi import FastAPI
from app.api import cv, job, analyze, rank

app = FastAPI(title="CV Screening AI - BGE Fixed")

app.include_router(cv.router, prefix="/api/cv", tags=["CV"])
app.include_router(job.router, prefix="/api/job", tags=["Job"])
app.include_router(analyze.router, prefix="/api/analyze", tags=["Analyze"])
app.include_router(rank.router, prefix="/api/rank", tags=["Rank"])

@app.get("/")
def root():
    return {"message": "CV AI System Running (BGE FIXED) 🚀"}