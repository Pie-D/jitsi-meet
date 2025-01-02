# Jitsi

# REQUIMENT: UBUNTU 20.04

Chạy file jitsi.sh

    cd /root/ && git clone https://github.com/hung-hust-97/jitsi-meet.git
    chmod +x jitsi.sh
    ./jitsi.sh

Trỏ domain vào ip public server

Jitsi tự động cài đặt Nginx, sau đó truy cập nginx: /etc/nginx/sites-available/domain.conf sửa mục root mặc định thành /root/jitsi-meet
Truy cập domain là vào được web

DOCUMENT: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart
