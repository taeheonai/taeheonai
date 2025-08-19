#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
간단한 FastAPI 테스트 서버
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Test Server", description="Simple test server")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "test-server"}

@app.get("/test")
async def test():
    return {"message": "Test endpoint working", "data": "success"}

if __name__ == "__main__":
    import uvicorn
    print("🚀 테스트 서버 시작 중...")
    print("📍 http://localhost:8003")
    uvicorn.run(app, host="0.0.0.0", port=8003)
