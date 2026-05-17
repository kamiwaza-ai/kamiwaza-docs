const NOT_FOUND_MARKERS = [
	"Page Not Found",
	"We could not find what you were looking for.",
	"Please contact the owner of the site that linked you to the original URL",
];

export function isDocusaurusNotFoundPage(
	title: string,
	bodyText: string,
): boolean {
	const haystack = `${title}\n${bodyText}`;
	return NOT_FOUND_MARKERS.every((marker) => haystack.includes(marker));
}
