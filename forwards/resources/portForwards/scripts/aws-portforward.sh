#!/bin/bash
#
# if [ $# -eq 0 ]
#   then
#     echo "No arguments supplied"
# fi
#
# while getopts i:p:P:l: flag
# do
#     case "${flag}" in
#         i)
#           host=${OPTARG};;
#         p)  
#           profile=${OPTARG};;
#         P)
#           port=${OPTARG};;
#         l)
#           localPort=${OPTARG};;
#     esac
# done
#
# if [ -z $profile ]
# then
#   export INSTANCEID=$(aws ec2 describe-instances --query "Reservations[*].Instances[*].InstanceId" --filters "Name=tag:Name,Values=$host" --output text)
#   aws ssm start-session --target "$INSTANCEID" --document-name AWS-StartPortForwardingSession --parameters "portNumber"="$port","localPortNumber"="$localPort"
# else
#   export INSTANCEID=$(aws ec2 describe-instances --profile $profile --query "Reservations[*].Instances[*].InstanceId" --filters "Name=tag:Name,Values=$host" --output text)
#   # aws ssm start-session --target "$INSTANCEID" --profile $profile --document-name AWS-StartPortForwardingSession --parameters "portNumber"="$port","localPortNumber"="$localPort"
#   aws ssm start-session \
#       --target $INSTANCEID \
#       --profile $profile \
#       --document-name AWS-StartPortForwardingSessionToRemoteHost # \
#       # --parameters '{"host":["ovrc-staging-shard-00-00-957zj.mongodb.net"],"portNumber":["27017"], "localPortNumber":["'"${localPort}"'"]}'
# fi
#
if [ $# -eq 0 ]
  then
    echo "No arguments supplied"
fi

while getopts i:p:P:l: flag
do
    case "${flag}" in
        i)
          host=${OPTARG};;
        p)  
          profile=${OPTARG};;
        P)
          port=${OPTARG};;
        l)
          localPort=${OPTARG};;
    esac
done

if [ -z $profile ]
then
  export INSTANCEID=$(aws ec2 describe-instances --query "Reservations[*].Instances[*].InstanceId" --filters "Name=tag:Name,Values=$host" --output text)
  aws ssm start-session --target "$INSTANCEID" --document-name AWS-StartPortForwardingSession --parameters "portNumber"="$port","localPortNumber"="$localPort"
else
  export INSTANCEID=$(aws ec2 describe-instances --profile $profile --query "Reservations[*].Instances[*].InstanceId" --filters "Name=tag:Name,Values=$host" --output text)
  # aws ssm start-session --target "$INSTANCEID" --profile $profile --document-name AWS-StartPortForwardingSession --parameters "portNumber"="$port","localPortNumber"="$localPort"

  # OpenSSH refuses keys whose perms are group/world-readable. The mounted
  # /run/keys/prodovrckey.pem is 0555 (bind-mounted from the host) and
  # can't be chmod'd in place, so copy it to a private temp file we own
  # and lock down. Cleaned up on exit so we don't leave decrypted-on-disk
  # residue if the script is killed.
  KEYFILE=$(mktemp -t prodovrckey.XXXXXX.pem) || { echo "Failed to create tempfile for SSH key" >&2; exit 1; }
  trap 'rm -f "$KEYFILE"' EXIT INT TERM
  cp /run/keys/prodovrckey.pem "$KEYFILE"
  chmod 600 "$KEYFILE"

  # The SSH transport is already wrapped in an authenticated SSM session,
  # so the SSH host-key check on `localhost` is redundant — and inside the
  # forwards container there's no interactive TTY to accept the prompt and
  # no persistent known_hosts to remember it. Skip the check and discard
  # the host key so we don't fail with "Host key verification failed".
  ssh -i "$KEYFILE" -N \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o LogLevel=ERROR \
      -o ExitOnForwardFailure=yes \
      -o ProxyCommand='aws ssm start-session --target "$INSTANCEID" --profile ovrc_prod_ssm --document-name AWS-StartSSHSession --parameters portNumber=22 --region us-east-1' \
      ubuntu@localhost -D 0.0.0.0:9925
fi