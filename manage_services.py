#!/usr/bin/env python3
"""
TaeheonAI MSA 통합 관리 스크립트
하나의 창에서 모든 서비스를 관리할 수 있습니다.
"""

import asyncio
import subprocess
import sys
import time
import signal
import os
from typing import List, Dict
import threading
import queue

class ServiceManager:
    def __init__(self):
        self.services = {
            'gateway': {
                'name': 'Gateway',
                'port': 8000,
                'path': 'gateway',
                'command': ['python', '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'],
                'process': None,
                'status': 'stopped'
            },
            'user-service': {
                'name': 'User Service',
                'port': 8001,
                'path': 'services/user-service',
                'command': ['python', '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8001', '--reload'],
                'process': None,
                'status': 'stopped'
            },
            'auth-service': {
                'name': 'Auth Service',
                'port': 8002,
                'path': 'services/auth-service',
                'command': ['python', '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8002', '--reload'],
                'process': None,
                'status': 'stopped'
            },
            'notification-service': {
                'name': 'Notification Service',
                'port': 8003,
                'path': 'services/notification-service',
                'command': ['python', '-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8003', '--reload'],
                'process': None,
                'status': 'stopped'
            }
        }
        self.running = True
        self.log_queue = queue.Queue()
        
    def print_banner(self):
        """배너 출력"""
        print("=" * 60)
        print("🚀 TaeheonAI MSA 통합 관리자")
        print("=" * 60)
        print("명령어:")
        print("  start     - 모든 서비스 시작")
        print("  stop      - 모든 서비스 중지")
        print("  restart   - 모든 서비스 재시작")
        print("  status    - 서비스 상태 확인")
        print("  logs      - 실시간 로그 보기")
        print("  health    - 서비스 헬스 체크")
        print("  quit      - 종료")
        print("=" * 60)
    
    def start_service(self, service_key: str):
        """개별 서비스 시작"""
        service = self.services[service_key]
        if service['process'] is not None:
            print(f"⚠️  {service['name']} 이미 실행 중입니다.")
            return
        
        try:
            # 작업 디렉토리 변경
            os.chdir(service['path'])
            
            # 프로세스 시작
            process = subprocess.Popen(
                service['command'],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )
            
            service['process'] = process
            service['status'] = 'running'
            
            print(f"✅ {service['name']} 시작됨 (포트: {service['port']})")
            
            # 로그 스레드 시작
            threading.Thread(
                target=self._log_reader,
                args=(process, service['name']),
                daemon=True
            ).start()
            
        except Exception as e:
            print(f"❌ {service['name']} 시작 실패: {e}")
            service['status'] = 'error'
    
    def _log_reader(self, process, service_name):
        """로그 읽기 스레드"""
        try:
            for line in iter(process.stdout.readline, ''):
                if line:
                    self.log_queue.put(f"[{service_name}] {line.strip()}")
        except Exception as e:
            print(f"로그 읽기 오류 ({service_name}): {e}")
    
    def stop_service(self, service_key: str):
        """개별 서비스 중지"""
        service = self.services[service_key]
        if service['process'] is None:
            print(f"⚠️  {service['name']} 실행 중이 아닙니다.")
            return
        
        try:
            service['process'].terminate()
            service['process'].wait(timeout=5)
            service['process'] = None
            service['status'] = 'stopped'
            print(f"🛑 {service['name']} 중지됨")
        except subprocess.TimeoutExpired:
            service['process'].kill()
            service['process'] = None
            service['status'] = 'stopped'
            print(f"🛑 {service['name']} 강제 중지됨")
        except Exception as e:
            print(f"❌ {service['name']} 중지 실패: {e}")
    
    def start_all(self):
        """모든 서비스 시작"""
        print("🚀 모든 서비스 시작 중...")
        for service_key in self.services:
            self.start_service(service_key)
            time.sleep(1)  # 서비스 간 간격
        print("✅ 모든 서비스가 시작되었습니다!")
    
    def stop_all(self):
        """모든 서비스 중지"""
        print("🛑 모든 서비스 중지 중...")
        for service_key in self.services:
            self.stop_service(service_key)
        print("✅ 모든 서비스가 중지되었습니다!")
    
    def restart_all(self):
        """모든 서비스 재시작"""
        print("🔄 모든 서비스 재시작 중...")
        self.stop_all()
        time.sleep(2)
        self.start_all()
    
    def show_status(self):
        """서비스 상태 표시"""
        print("\n📊 서비스 상태:")
        print("-" * 50)
        for service_key, service in self.services.items():
            status_icon = "🟢" if service['status'] == 'running' else "🔴"
            print(f"{status_icon} {service['name']}: {service['status']} (포트: {service['port']})")
        print("-" * 50)
    
    def show_logs(self):
        """실시간 로그 표시"""
        print("📝 실시간 로그 (Ctrl+C로 종료):")
        print("-" * 50)
        try:
            while True:
                try:
                    log = self.log_queue.get(timeout=1)
                    print(log)
                except queue.Empty:
                    pass
        except KeyboardInterrupt:
            print("\n로그 보기 종료")
    
    def health_check(self):
        """서비스 헬스 체크"""
        import requests
        print("🏥 서비스 헬스 체크:")
        print("-" * 50)
        
        for service_key, service in self.services.items():
            if service['status'] == 'running':
                try:
                    response = requests.get(f"http://localhost:{service['port']}/health", timeout=5)
                    if response.status_code == 200:
                        print(f"✅ {service['name']}: 건강함")
                    else:
                        print(f"⚠️  {service['name']}: 응답 오류 ({response.status_code})")
                except Exception as e:
                    print(f"❌ {service['name']}: 연결 실패 ({e})")
            else:
                print(f"🔴 {service['name']}: 실행 중이 아님")
        print("-" * 50)
    
    def run(self):
        """메인 실행 루프"""
        self.print_banner()
        
        while self.running:
            try:
                command = input("\n명령어 입력: ").strip().lower()
                
                if command == 'start':
                    self.start_all()
                elif command == 'stop':
                    self.stop_all()
                elif command == 'restart':
                    self.restart_all()
                elif command == 'status':
                    self.show_status()
                elif command == 'logs':
                    self.show_logs()
                elif command == 'health':
                    self.health_check()
                elif command == 'quit':
                    print("👋 종료합니다...")
                    self.stop_all()
                    break
                else:
                    print("❌ 잘못된 명령어입니다. 다시 시도해주세요.")
                    
            except KeyboardInterrupt:
                print("\n👋 종료합니다...")
                self.stop_all()
                break
            except Exception as e:
                print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    manager = ServiceManager()
    manager.run() 