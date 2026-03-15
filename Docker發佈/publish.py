#!/usr/bin/env python3
"""
publish.py

用途：在專案根目錄下自動化：
  - 建置前端 (vue3-ADadmin)（npm install / npm run build）
  - 建置後端 (ADadmin-api)（npm install）
  - 使用 docker-compose 建置鏡像
  - 可選擇將 image 存成 tar 檔以便離線分發

範例：
  python3 publish.py --tag-prefix luliya27 --save

註：執行此腳本需要在系統上安裝 node/npm 與 docker/docker-compose
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "Docker發佈" / "image"
FRONTEND_DIR = ROOT / "vue3-ADadmin"
BACKEND_DIR = ROOT / "ADadmin-api"
DOCKER_DEPLOY_DIR = ROOT / "Docker部署"


def run(cmd, cwd=None, env=None):
    print("->", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=cwd, env=env)


def npm_install_and_build_frontend():
    print("[frontend] 安裝相依並建置 vue 前端...")
    run(["npm", "install"], cwd=str(FRONTEND_DIR))
    run(["npm", "run", "build"], cwd=str(FRONTEND_DIR))


def npm_install_backend():
    print("[backend] 安裝相依套件...")
    run(["npm", "install"], cwd=str(BACKEND_DIR))


def docker_compose_build():
    print("[docker] 建置 Docker 鏡像...")
    run(["docker-compose", "build"], cwd=str(DOCKER_DEPLOY_DIR))


def docker_save_multi(image_tags, out_path: Path):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    print(f"儲存 images {image_tags} -> {out_path}")
    run(["docker", "save", "-o", str(out_path)] + image_tags)


def verify_images_exist(image_tags):
    """驗證 Docker 鏡像是否存在"""
    result = subprocess.run(["docker", "images", "--format", "{{.Repository}}:{{.Tag}}"], 
                          capture_output=True, text=True, check=True)
    existing_images = result.stdout.splitlines()
    
    print("\n[檢查] 現有 Docker 鏡像：")
    for img in existing_images:
        print(f"  - {img}")
    
    missing = []
    for tag in image_tags:
        if tag not in existing_images:
            missing.append(tag)
    
    if missing:
        print(f"\n[錯誤] 找不到以下鏡像：{missing}")
        print("可能原因：")
        print("  1. docker-compose build 失敗")
        print("  2. 鏡像名稱不正確")
        print("\n請檢查 docker-compose build 的輸出")
        sys.exit(1)
    else:
        print(f"✓ 所有鏡像驗證成功")


def docker_push(image_tag):
    print(f"推送 {image_tag} 到 registry...")
    run(["docker", "push", image_tag])


def parse_args():
    p = argparse.ArgumentParser(description="Build frontend/backend and Docker images for deployment")
    p.add_argument("--tag-prefix", default="luliya27", help="image tag prefix, e.g. username or repo")
    p.add_argument("--save", action="store_true", help="save built images to Docker發佈/image/*.tar")
    p.add_argument("--push", action="store_true", help="push images to registry after build (docker push)")
    p.add_argument("--version", default=None, help="image version, e.g. 0.1.0 (optional)")
    p.add_argument("--no-build", action="store_true", help="skip frontend/backend build, only save existing images")
    return p.parse_args()


def main():
    args = parse_args()
    prefix = args.tag_prefix.rstrip('/')

    try:
        # Skip build if --no-build is specified
        if not args.no_build:
            # frontend build (npm build outputs to vue3-ADadmin/dist)
            npm_install_and_build_frontend()

            # backend deps
            npm_install_backend()

            # docker-compose build
            docker_compose_build()
        else:
            print("[skip] 跳過前端/後端構建")

        # 鏡像名稱 (docker-compose 自動命名為 adadmin-docker-api:latest, adadmin-docker-frontend:latest)
        api_image = "adadmin-docker-api:latest"
        frontend_image = "adadmin-docker-frontend:latest"

        if args.push:
            # 如果需要推送，需要重新標籤為 registry 格式
            registry_api = f"{prefix}/adadmin-api:latest"
            registry_frontend = f"{prefix}/vue3-adadmin:latest"
            
            run(["docker", "tag", api_image, registry_api])
            run(["docker", "tag", frontend_image, registry_frontend])
            
            docker_push(registry_api)
            docker_push(registry_frontend)

        if args.save:
            # 驗證鏡像是否存在
            verify_images_exist([api_image, frontend_image])
            
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            from datetime import datetime
            date_str = datetime.now().strftime('%Y-%m-%d')
            version = args.version
            if version is None:
                # 互動式詢問版本號，可留白
                try:
                    version = input("請輸入版本號 (可留白直接 Enter 跳過): ").strip()
                except EOFError:
                    version = ""
            tar_name = f"vue3-ADadmin-web_{date_str}"
            if version:
                tar_name += f"_{version}"
            tar_name += ".tar"
            tar_path = OUTPUT_DIR / tar_name
            
            print(f"\n[保存] 打包鏡像到 {tar_path}")
            docker_save_multi([api_image, frontend_image], tar_path)
            
            # 驗證檔案是否成功建立
            if tar_path.exists():
                file_size = tar_path.stat().st_size / (1024 * 1024)  # MB
                print(f"✓ tar 檔案成功建立：{tar_path}")
                print(f"  檔案大小：{file_size:.2f} MB")
            else:
                print(f"✗ 錯誤：tar 檔案未能建立")
                sys.exit(1)

        print("全部完成。建議接下來可執行：\n  - 在伺服機上使用 docker load 與 docker-compose up 部署\n  - 或使用 docker push 推到 registry 然後在部署環境 pull")

    except subprocess.CalledProcessError as e:
        print("Error: 命令執行失敗", e, file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()