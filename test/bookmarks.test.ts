import { describe, expect, it } from "vitest";
import { parseBookmarksHtml, toBookmarksHtml } from "../lib/bookmarks";

const chrome = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1700000000" LAST_MODIFIED="1700000001" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://Example.com/a#top" ADD_DATE="1700000002" ICON="data:image/png;base64,AAAA">Example A</A>
        <DT><A HREF="https://example.com/b" ADD_DATE="1700000003">Tom &amp; Jerry &lt;3</A>
        <DT><A HREF="https://example.com/a" ADD_DATE="1700000004">Duplicate of A</A>
    </DL><p>
</DL><p>
`;

const firefox = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<DL><p>
    <DT><A HREF="https://developer.mozilla.org/" ADD_DATE="1700000000" TAGS="Docs,web dev,c++">MDN &#8211; Web Docs</A>
    <DT><A HREF="javascript:alert(1)">Bookmarklet</A>
    <DT><A HREF="ftp://files.example.com/">FTP</A>
    <DT><A HREF='https://example.com/single'>Single quotes</A>
</DL>
`;

describe("parseBookmarksHtml", () => {
  it("reads a Chrome export, normalizing and deduplicating URLs", () => {
    expect(parseBookmarksHtml(chrome)).toEqual({
      links: [
        { url: "https://example.com/a", title: "Example A", tags: [] },
        { url: "https://example.com/b", title: "Tom & Jerry <3", tags: [] },
      ],
      invalid: 0,
    });
  });

  it("reads a Firefox export with TAGS and keeps only valid tags", () => {
    const { links } = parseBookmarksHtml(firefox);
    expect(links[0]).toEqual({ url: "https://developer.mozilla.org/", title: "MDN – Web Docs", tags: ["docs", "web-dev"] });
    expect(links[1]).toEqual({ url: "https://example.com/single", title: "Single quotes", tags: [] });
  });

  it("counts javascript: and ftp: URLs as invalid", () => {
    expect(parseBookmarksHtml(firefox).invalid).toBe(2);
  });

  it("uses the URL as the title when the text is empty", () => {
    expect(parseBookmarksHtml('<A HREF="https://example.com/x"></A>').links[0].title).toBe("https://example.com/x");
  });

  it("round-trips through toBookmarksHtml, including <, &, and quotes", () => {
    const links = [
      { url: "https://example.com/q?a=1&b=2", title: 'A <b>"quoted"</b> & \'single\'', tags: ["x", "y-z"] },
      { url: "https://example.com/plain", title: "Plain", tags: [] },
    ];

    const html = toBookmarksHtml(links.map((link) => ({ ...link, createdAt: new Date(Date.UTC(2025, 0, 1)) })));

    expect(parseBookmarksHtml(html)).toEqual({ links, invalid: 0 });
  });
});
