#!/usr/bin/env bash
set -euo pipefail

ssoLogin() {
    local awsProfile="${PORT_FORWARD_AWS_SSO_LOGIN_PROFILE:-prod_access_1}"
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -p|--profile)
                if [[ -n "${2:-}" && "${2:-}" != -* ]]; then
                    awsProfile="$2"
                    shift 2
                else
                    echo "Error: Missing value for $1"
                    return 1
                fi
                ;;
            *)
                echo -e "Invalid option selected: $1\nValid options: -p|--profile\n"
                return 1
                ;;
        esac
    done

    local hasSsoConfig=""
    hasSsoConfig=$(aws configure get sso_start_url --profile "$awsProfile" 2>/dev/null || true)
    if [[ -z "$hasSsoConfig" ]]; then
        hasSsoConfig=$(aws configure get sso_session --profile "$awsProfile" 2>/dev/null || true)
    fi

    if [[ -z "$hasSsoConfig" ]]; then
        for fallback in prod_access_1 ovrc_stage prod_access dev_access snap-stage snap_stage c4-prod c4-dev; do
            if ! aws configure list-profiles | grep -qx "$fallback"; then
                continue
            fi

            local fallbackSso
            fallbackSso=$(aws configure get sso_start_url --profile "$fallback" 2>/dev/null || true)
            if [[ -z "$fallbackSso" ]]; then
                fallbackSso=$(aws configure get sso_session --profile "$fallback" 2>/dev/null || true)
            fi

            if [[ -n "$fallbackSso" ]]; then
                awsProfile="$fallback"
                echo "Selected fallback SSO profile: $awsProfile"
                break
            fi
        done
    fi

    if ! aws configure list-profiles | grep -qx "$awsProfile"; then
        echo "No valid AWS SSO login profile found in ~/.aws/config."
        echo "Set PORT_FORWARD_AWS_SSO_LOGIN_PROFILE to an existing profile name."
        return 1
    fi

    echo "Running AWS SSO login for profile: $awsProfile"
    aws sso login --profile "$awsProfile"
    echo "AWS SSO login complete for profile: $awsProfile"
}

updateAwsCreds() {
    ssoLogin

    local file
    file=$(ls -1t "$HOME/.aws/sso/cache/"*.json 2>/dev/null | head -1 || true)

    if [[ -z "${file:-}" ]]; then
        echo "Could not find an AWS SSO cache token file."
        return 1
    fi

    local token
    token=$(jq -r '.accessToken // empty' "$file")
    if [[ -z "$token" ]]; then
        echo "Could not read accessToken from $file"
        return 1
    fi

    local profilesRaw
    profilesRaw="${PORT_FORWARD_AWS_PROFILE_MAPPINGS:-prod_access,prod_access,Developer,367507620554,us-east-1;dev_access,dev_access,Developer,489561981168,us-east-1;snap_dev,dev_access,Developer,268853364163,us-east-1;snap_stage,ovrc_stage,Developer,642727902844,us-east-1}"

    local codeArtifactProfile
    codeArtifactProfile="${PORT_FORWARD_AWS_CODEARTIFACT_PROFILE:-prod_access}"
    local codeArtifactDomain
    codeArtifactDomain="${PORT_FORWARD_AWS_CODEARTIFACT_DOMAIN:-control4}"

    IFS=';' read -r -a profileValues <<< "$profilesRaw"

    if [[ ${#profileValues[@]} -eq 0 ]]; then
        echo "No profile mappings found. Set PORT_FORWARD_AWS_PROFILE_MAPPINGS."
        return 1
    fi

    echo
    for profile in "${profileValues[@]}"; do
        IFS=',' read -r credName configname role accountId region <<< "$profile"

        if [[ -z "${credName:-}" || -z "${configname:-}" || -z "${role:-}" || -z "${accountId:-}" || -z "${region:-}" ]]; then
            echo "Skipping invalid profile mapping: $profile"
            continue
        fi

        echo -e "Getting credentials using:\ncredName: $credName, configname: $configname, role: $role, accountId: $accountId, region: $region"

        local creds
        creds=$(aws sso get-role-credentials \
            --account-id "$accountId" \
            --role-name "$role" \
            --region "$region" \
            --access-token "$token")

        local access_key
        local secret_key
        local session_token
        access_key=$(echo "$creds" | jq -r '.roleCredentials.accessKeyId')
        secret_key=$(echo "$creds" | jq -r '.roleCredentials.secretAccessKey')
        session_token=$(echo "$creds" | jq -r '.roleCredentials.sessionToken')

        aws configure set aws_access_key_id "$access_key" --profile "$credName"
        aws configure set aws_secret_access_key "$secret_key" --profile "$credName"
        aws configure set aws_session_token "$session_token" --profile "$credName"
        echo "AWS credentials file for profile '$credName' updated successfully."

        if [ "$credName" = "$codeArtifactProfile" ]; then
            export CODEARTIFACT_AUTH_TOKEN
            CODEARTIFACT_AUTH_TOKEN=$(aws codeartifact get-authorization-token --domain "$codeArtifactDomain" --domain-owner "$accountId" --query authorizationToken --output text --profile "$credName" --region "$region")
            echo "Successfully updated CODEARTIFACT_AUTH_TOKEN for this process"
        fi

        echo
    done
}

updateAwsCreds "$@"
