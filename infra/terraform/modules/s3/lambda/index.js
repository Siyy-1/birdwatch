exports.handler = async (event) => {
  const request = event.Records[0].cf.request;
  const method = request.method;

  if (method === "PUT" || method === "POST") {
    const header = request.headers["content-type"];
    const contentType = header && header[0] ? header[0].value : "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return {
        status: "415",
        statusDescription: "Unsupported Media Type",
        headers: {
          "content-type": [
            {
              key: "Content-Type",
              value: "text/plain; charset=utf-8",
            },
          ],
        },
        body: "Only image uploads are allowed.",
      };
    }
  }

  return request;
};
