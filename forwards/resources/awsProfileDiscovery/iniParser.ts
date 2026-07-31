// Minimal INI parser for AWS's ~/.aws/config and ~/.aws/credentials files.
// Section headers are returned exactly as written (e.g. "profile foo", "default",
// "foo") since config and credentials name profiles differently.
export function parseIni(text: string): Record<string, Record<string, string>> {
    const sections: Record<string, Record<string, string>> = {};
    let currentSection: string | null = null;

    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#") || line.startsWith(";")) continue;

        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1].trim();
            sections[currentSection] ??= {};
            continue;
        }

        if (!currentSection) continue;

        const kvMatch = line.match(/^([^=]+)=(.*)$/);
        if (!kvMatch) continue;

        const key = kvMatch[1].trim();
        const value = kvMatch[2].trim();
        sections[currentSection][key] = value;
    }

    return sections;
}

// AWS config profile sections are named "profile <name>" (except "default").
// Credentials file sections are just the profile name directly.
export function configSectionToProfileName(section: string): string {
    if (section === "default") return "default";
    return section.startsWith("profile ") ? section.slice("profile ".length).trim() : section;
}

// Inverse of parseIni. Section/key insertion order is preserved (JS object
// key order), so re-serializing an untouched parse round-trips unchanged
// aside from normalized "key = value" spacing and dropped comments.
export function serializeIni(sections: Record<string, Record<string, string>>): string {
    return Object.entries(sections)
        .map(([section, keys]) => {
            const lines = Object.entries(keys).map(([key, value]) => `${key} = ${value}`);
            return [`[${section}]`, ...lines].join("\n");
        })
        .join("\n\n") + "\n";
}
