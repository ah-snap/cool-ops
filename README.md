Running assumes that you have port 1433 forwarded for security 16 and port 9925 forwarded for mongo Socks


How I'm forwarding the port for security 16.  This assumes your profile name for c4 prod is `prod_access`
```
aws ssm start-session --region us-east-2 --target i-03c11f3bcfd51b0d9 \
    --document-name AWS-StartPortForwardingSessionToRemoteHost \
    --parameters host="10.201.1.20",portNumber="1433",localPortNumber="1433" \
    --profile prod_access
```

How I'm forwarding the port for mongo.  This assumes you have a prod ovrc user named `ovrc_prod_ssm`, and a pem file `prodovrckey.pem`
```
ssh -i ~/.ssh/prodovrckey.pem -N -o \
    ProxyCommand='aws ssm start-session \
        --target "i-0b948dc3e42999200" \
        --profile ovrc_prod_ssm \
        --document-name AWS-StartSSHSession \
        --parameters portNumber=22 \
        --region us-east-1' \
    ubuntu@localhost -D 9925
```

Also you need to create a .env file with the following values
```
mongoConnectionString="mongodb+srv://[user]:[password]@csprod-tsqwb.mongodb.net/?authMechanism=SCRAM-SHA-1&authSource=admin&tls=true&proxyHost=localhost&proxyPort=9925"
security16User="[user]"
security16Password="[password]"
security16Database="Security_16"
```


Starting server
```
cd ./server
npm start
```

Starting Client
```
cd ./client
npm start
```
