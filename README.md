# print-preview

## Why?

If you ever had a requirement to convert a webpage to a PDF report you might have used [Puppeteer](https://github.com/puppeteer/puppeteer).

You just open the webpage in headless mode and call [page.pdf](https://github.com/puppeteer/puppeteer/blob/v10.4.0/docs/api.md#pagepdfoptions)

I am using the same flow for generating PDF reports at my company.

But I faced certain issues
- Some components were getting cut off between pages
- Hide Header and Footer on the first page
- There was no way to display a preview to the user of what the PDF report will look like before clicking on the download button

So I developed `print-preview` library to handle these.


## How this thing works?

`print-preview` tells you which DOM nodes can be placed inside a PDF page. That's it.

It can work on any DOM node (and react components too) with a tiny help from you.

You just need to add two [data-* attributes](https://www.w3schools.com/tags/att_data-.asp) on the DOM `data-print-type` & `data-print-id`

`data-print-id` should be a unique id for DOM while `data-print-type` can have these values as defined by `ElType` (Element types)

```
enum ElType {
    HEADER = 'HEADER',
    SUB_HEADER = 'SUB_HEADER',
    COVER_PAGE = 'COVER_PAGE', // only on page 1
    CONTENT = 'CONTENT',
    CONTENT_HEADER = 'CONTENT_HEADER', // header for specific content
    SUB_CONTENT = 'SUB_CONTENT',
    FOOTER = 'FOOTER',
    TEXT = 'TEXT', // simple text or rich text
}
```

printPreview (using camelcase as it's too much hassle to make it code block :P) works only on just these two `data-print-*` attributes.
It looks for the entire page for DOMs with these HTML attributes and treats them as the building blocks.
Then it starts computing how much height these identified blocks of DOM will take as PDF pages and gives out a list of `PageDetail`

```
interface PageDetail {
    pageNumber: number;
    totalPages: number;
    pageHeight: number;
    elDetails: ElDetail[];
}
```

```
interface ElDetail {
    type: string; // ElType
    id: string; // data-print-id
    height: number; // computed by printPreivew
    childElDetails?: ElDetail[]; // for nested DOMs with data-print-* attributes

    // ignore these advance options for now
    fill?: boolean;
    textHeight?: number;
    overflow?: boolean;
    pageBreak?: string;
}
```

Don't worry if you are not completely understanding these interfaces now. They will make sense when you see the sample code or just use it.

This `PageDetail` interface is the value addition of printPreview. This tells you on which page which DOM should be placed. 

If the DOM is getting too big for the page then printPreview creates a new page and add it there. 

This makes sure that there is no page cut in between the DOMs.

> However this list of `PageDetail` is all that printPreivew will give you. It won't render the final report. That is again on you.

## Example

I will urge you to go through [this code](https://github.com/mishrasaurus/print-preview/blob/main/src/printPreview.stories.tsx).

This is an example of a dummy HTML page generated using React which has renders dynamic height divs one below another.

printPreview computes the `PageDetails` and using that we render the "preview" as separate pages, just like they will be shown in PDF format.




