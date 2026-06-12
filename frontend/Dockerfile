FROM oven/bun:1-alpine

WORKDIR /app

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "bun --eval \"Bun.serve({ port: Number(process.env.PORT ?? 3000), fetch() { return new Response('Frontend placeholder', { headers: { 'content-type': 'text/plain' } }); } }); console.log('Frontend placeholder running on port ' + (process.env.PORT ?? 3000));\""]
