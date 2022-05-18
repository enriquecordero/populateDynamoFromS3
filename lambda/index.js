const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });
const s3 = new AWS.S3();
const dynamoClient = new AWS.DynamoDB.DocumentClient();
const dynamodb = new AWS.DynamoDB();
const Bucket_NAME = "bcpr-dev-s3jsonuploaddynamo";


exports.handler =  function (event) {
  dynamodb
    .listTables()
    .promise()
    .then((data) =>
      data.TableNames.forEach((table) => {
        console.log(table);
        let namesplit = table.split("-", 3)[2].toLowerCase();
        //console.log(`${namesplit}-data.json`)

        s3.getObject(
          {
            Bucket: Bucket_NAME,
            Key: `${namesplit}-data.json`,
          },
          function (err, data) {
            if (err) return console.error(err);

            let objectData = data.Body.toString();
            let dataJson = JSON.parse(objectData);
            //console.log( objectData)

            dataJson.map((element) => {
              let unmarshalled = AWS.DynamoDB.Converter.unmarshall(element);
              //console.log(element);
              //console.log(unmarshalled)
              let params = {
                RequestItems: {
                  [table]: [
                    {
                      PutRequest: {
                        Item: unmarshalled,
                      },
                    },
                  ],
                },
              };
              dynamoClient.batchWrite(params).promise();
            });
          }
        );
      })
    )
    .catch(console.error);
};
