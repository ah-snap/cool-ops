#!/usr/bin/env bash
set -euo pipefail

USE_DEFAULTS=false
if [[ "${1:-}" == "--use-defaults" ]]; then
    USE_DEFAULTS=true
fi

expected_mappings=(
    "prod_access|prod_access|Developer|367507620554|us-east-1|Control4 production developer access"
    "dev_access|dev_access|Developer|489561981168|us-east-1|Control4 development developer access"
    "snap_dev|dev_access|Developer|268853364163|us-east-1|OvrC dev access"
    "snap_stage|ovrc_stage|Developer|642727902844|us-east-1|OvrC stage access"
    "ovrc_prod_ssm|prod_access_1|SsmUser|445822975327|us-east-1|OvrC SSM jump-host access"
)

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Required command not found in PATH: $1" >&2
        exit 1
    fi
}

get_aws_profiles() {
    aws configure list-profiles 2>/dev/null | awk 'NF > 0'
}

is_sso_profile() {
    local profile="$1"
    local start_url
    local session_name

    start_url="$(aws configure get sso_start_url --profile "$profile" 2>/dev/null || true)"
    if [[ -n "$start_url" ]]; then
        return 0
    fi

    session_name="$(aws configure get sso_session --profile "$profile" 2>/dev/null || true)"
    [[ -n "$session_name" ]]
}

print_menu() {
    local default_value="$1"
    shift
    local options=("$@")

    local i
    for ((i = 0; i < ${#options[@]}; i++)); do
        local marker=""
        if [[ "${options[$i]}" == "$default_value" ]]; then
            marker=" (default)"
        fi
        printf '[%d] %s%s\n' "$((i + 1))" "${options[$i]}" "$marker" >&2
    done
}

print_simple_numbered_list() {
    local options=("$@")
    local i

    for ((i = 0; i < ${#options[@]}; i++)); do
        printf '[%d] %s\n' "$((i + 1))" "${options[$i]}" >&2
    done
}

prompt_for_selection() {
    local prompt="$1"
    local default_value="$2"
    shift 2
    local options=("$@")

    while true; do
        print_menu "$default_value" "${options[@]}"
        read -r -p "$prompt" response >&2

        if [[ -z "$response" ]]; then
            if [[ -n "$default_value" ]]; then
                printf '%s\n' "$default_value"
                return 0
            fi

            echo 'Please enter a selection.' >&2
            continue
        fi

        if [[ "$response" =~ ^[0-9]+$ ]]; then
            local index=$((response - 1))
            if (( index >= 0 && index < ${#options[@]} )); then
                printf '%s\n' "${options[$index]}"
                return 0
            fi
        fi

        echo 'Invalid selection. Enter a line number from the list above.' >&2
    done
}

prompt_with_default() {
    local prompt="$1"
    local default_value="$2"
    local response

    read -r -p "$prompt [$default_value] " response
    if [[ -z "$response" ]]; then
        printf '%s\n' "$default_value"
        return 0
    fi

    printf '%s\n' "$response"
}

pick_default_profile() {
    local preferred_config="$1"
    local preferred_credential="$2"
    shift 2
    local profiles=("$@")

    local profile
    for profile in "${profiles[@]}"; do
        if [[ "$profile" == "$preferred_config" ]]; then
            printf '%s\n' "$profile"
            return 0
        fi
    done

    for profile in "${profiles[@]}"; do
        if [[ "$profile" == "$preferred_credential" ]]; then
            printf '%s\n' "$profile"
            return 0
        fi
    done

    printf '%s\n' "${profiles[0]}"
}

require_command aws

available_profiles=()
while IFS= read -r profile; do
    available_profiles+=("$profile")
done < <(get_aws_profiles)
if (( ${#available_profiles[@]} == 0 )); then
    echo 'No AWS profiles were found. Configure ~/.aws first.' >&2
    exit 1
fi

sso_profiles=()
for profile in "${available_profiles[@]}"; do
    if is_sso_profile "$profile"; then
        sso_profiles+=("$profile")
    fi
done

echo 'Inspecting AWS profiles from your local ~/.aws configuration...'
echo
echo 'Available AWS profiles:'
print_simple_numbered_list "${available_profiles[@]}"

if (( ${#sso_profiles[@]} > 0 )); then
    echo
    echo 'Profiles with SSO configuration detected:'
    print_simple_numbered_list "${sso_profiles[@]}"
fi

selected_mappings=()

for mapping in "${expected_mappings[@]}"; do
    IFS='|' read -r credential_profile default_config role account_id region purpose <<< "$mapping"

    default_profile="$(pick_default_profile "$default_config" "$credential_profile" "${available_profiles[@]}")"

    echo
    echo "Mapping for $credential_profile ($purpose)"

    if [[ "$USE_DEFAULTS" == true ]]; then
        selected_profile="$default_profile"
        selected_role="$role"
        selected_account_id="$account_id"
        selected_region="$region"
    else
        selected_profile="$(prompt_for_selection 'Choose the config profile line number (press Enter for default): ' "$default_profile" "${available_profiles[@]}")"
        selected_role="$(prompt_with_default 'Role name' "$role")"
        selected_account_id="$(prompt_with_default 'Account ID' "$account_id")"
        selected_region="$(prompt_with_default 'Region' "$region")"
    fi

    selected_mappings+=("$credential_profile,$selected_profile,$selected_role,$selected_account_id,$selected_region")
done

default_sso_profile="${available_profiles[0]}"
for profile in "${sso_profiles[@]}"; do
    if [[ "$profile" == 'prod_access_1' ]]; then
        default_sso_profile='prod_access_1'
        break
    fi
    default_sso_profile="$profile"
done

if [[ "$USE_DEFAULTS" == true ]]; then
    selected_sso_profile="$default_sso_profile"
else
    echo
    selected_sso_profile="$(prompt_for_selection 'Choose PORT_FORWARD_AWS_SSO_LOGIN_PROFILE line number (press Enter for default): ' "$default_sso_profile" "${available_profiles[@]}")"
fi

selected_credential_profiles=()
for mapping in "${selected_mappings[@]}"; do
    IFS=',' read -r credential_profile _ <<< "$mapping"
    selected_credential_profiles+=("$credential_profile")
done

default_codeartifact_profile="${selected_credential_profiles[0]}"
for profile in "${selected_credential_profiles[@]}"; do
    if [[ "$profile" == 'prod_access' ]]; then
        default_codeartifact_profile='prod_access'
        break
    fi
done

if [[ "$USE_DEFAULTS" == true ]]; then
    selected_codeartifact_profile="$default_codeartifact_profile"
else
    echo
    selected_codeartifact_profile="$(prompt_for_selection 'Choose PORT_FORWARD_AWS_CODEARTIFACT_PROFILE line number (press Enter for default): ' "$default_codeartifact_profile" "${selected_credential_profiles[@]}")"
fi

mapping_value="$(IFS=';'; echo "${selected_mappings[*]}")"

echo
echo 'Mapping format:'
echo '  credentialProfile,configProfile,role,accountId,region'
echo 'Sanity check:'
echo '  - credentialProfile is the profile name the app expects to write credentials into'
echo '  - configProfile is the AWS config/SSO profile you selected from the numbered list'
echo '  - entries are separated by semicolons'
echo
echo 'Add these lines to your .env:'
echo "PORT_FORWARD_AWS_SSO_LOGIN_PROFILE=$selected_sso_profile"
echo "PORT_FORWARD_AWS_PROFILE_MAPPINGS=$mapping_value"
echo "PORT_FORWARD_AWS_CODEARTIFACT_PROFILE=$selected_codeartifact_profile"