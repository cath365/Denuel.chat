FROM mongo:8.0

COPY deploy/render/mongo/start-mongo.sh /usr/local/bin/start-mongo.sh

RUN chmod +x /usr/local/bin/start-mongo.sh

CMD ["/usr/local/bin/start-mongo.sh"]
