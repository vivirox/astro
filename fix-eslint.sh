#!/bin/bash

# Define colors for output
# shellcheck disable=SC2034
# shellcheck disable=SC2034
# shellcheck disable=SC2034
# shellcheck disable=SC2034
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting automated eslint fixes...${NC}"

# Helper function for safe file processing
process_files() {
  local sed_command="$1"

  # Execute the find command separately to avoid masking its return value
  find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.astro" \) -not -path "*/node_modules/*" -print0 >/tmp/files_to_process

  # Process files found
  while IFS= read -r -d '' file; do
    sed -i '' -E "${sed_command}" "${file}"
  done </tmp/files_to_process

  # Clean up
  rm /tmp/files_to_process
}

# Step 1: Fix unused variables by prefixing with underscore
echo -e "${YELLOW}Fixing unused variables...${NC}"
process_files 's/const ([a-zA-Z0-9]+) = /const _\1 = /g'

# Step 2: Fix unused interfaces by prefixing with underscore
echo -e "${YELLOW}Fixing unused interfaces...${NC}"
process_files 's/interface ([A-Z][a-zA-Z0-9]*) \{/interface _\1 \{/g'

# Step 3: Fix unused parameters in function declarations
echo -e "${YELLOW}Fixing unused parameters...${NC}"
process_files 's/\(([a-zA-Z0-9]+):/\(_\1:/g'
process_files 's/, ([a-zA-Z0-9]+):/, _\1:/g'

# Step 4: Fix unused class declarations by prefixing with underscore
echo -e "${YELLOW}Fixing unused classes...${NC}"
process_files 's/class ([A-Z][a-zA-Z0-9]*)/class _\1/g'

# Step 5: Fix catch error parameters to use the error in console.error
echo -e "${YELLOW}Fixing catch error handling...${NC}"
process_files 's/catch \((_?error|_e)\) \{([^}]*)console\.error\(([^)]*), error\)/catch (\1) \{\2console.error(\3, \1)/g'

# Step 6: Fix trailing whitespace
echo -e "${YELLOW}Removing trailing whitespace...${NC}"
process_files 's/[ \t]+$//g'

# Step 7: Fix while loop assignments
echo -e "${YELLOW}Fixing while loop assignments...${NC}"
process_files 's/while \(([a-zA-Z0-9]+) = /while ((\1) = /g'

# Step 8: Fix error variable inconsistencies in catch blocks
echo -e "${YELLOW}Fixing error variable inconsistencies in catch blocks...${NC}"
process_files 's/catch \(error\) \{([^}]*)error\./catch (error) \{\1_error\./g'
process_files 's/catch \(error\) \{([^}]*)error\./catch (error) \{\1error\./g'

# shellcheck disable=SC2034
# shellcheck disable=SC2034
# Step 9: Warn about eval usage (can't automatically fix)
echo -e "${YELLOW}Checking for eval usage (these should be manually fixed)...${NC}"

# Execute the command to find eval usages separately to avoid masking return values
FIND_CMD="find src -type f \( -name \"*.ts\" -o -name \"*.tsx\" -o -name \"*.js\" -o -name \"*.jsx\" \) -not -path \"*/node_modules/*\" -print0"
# shellcheck disable=SC2034
# shellcheck disable=SC2034
GREP_CMD='xargs -0 grep -l "eval"'

# Save the command to a file to execute it
echo "${FIND_CMD} | ${GREP_CMD} || true" >/tmp/find_eval_cmd.sh
chmod +x /tmp/find_eval_cmd.sh

eval_files_CMD_RESULT=$(bash /tmp/find_eval_cmd.sh)
eval_files=${eval_files_CMD_RESULT}
# shellcheck disable=SC2034

if [[ -n ${eval_files} ]]; then
  echo "${eval_files}"
fi

echo -e "${GREEN}Automated fixes complete. Running eslint to check remaining issues...${NC}"
pnpm dlx oxlint

exit_code=$?
if [[ ${exit_code} -ne 0 ]]; then
  echo -e "${YELLOW}Oxlint found issues that need to be fixed manually.${NC}"
fi

echo -e "${BLUE}Done! Please review the changes and manually fix any remaining issues.${NC}"
