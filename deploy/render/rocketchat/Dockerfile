FROM registry.rocket.chat/rocketchat/rocket.chat:8.4.2

COPY deploy/render/rocketchat/start-rocketchat.sh /usr/local/bin/start-rocketchat.sh

RUN chmod +x /usr/local/bin/start-rocketchat.sh

CMD ["/usr/local/bin/start-rocketchat.sh"]
