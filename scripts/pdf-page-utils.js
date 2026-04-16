"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDocusaurusNotFoundPage = isDocusaurusNotFoundPage;
const NOT_FOUND_MARKERS = [
    "Page Not Found",
    "We could not find what you were looking for.",
    "Please contact the owner of the site that linked you to the original URL",
];
function isDocusaurusNotFoundPage(title, bodyText) {
    const haystack = `${title}\n${bodyText}`;
    return NOT_FOUND_MARKERS.every((marker) => haystack.includes(marker));
}
