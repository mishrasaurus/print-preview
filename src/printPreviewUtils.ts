import _get from 'lodash/get';
import _map from 'lodash/map';
import _first from 'lodash/first';
import _reduce from 'lodash/reduce';
import _assign from 'lodash/assign';
import _forEach from 'lodash/forEach';
import _cloneDeep from 'lodash/cloneDeep';
import _uniqueId from 'lodash/uniqueId';
import { ElDetail, ElType, PageDetail } from './printPreviewTypes';

interface ContentHeaderTypes {
    flag: boolean;
    elDetail: ElDetail | null;
    height: number;
}

function getElementHeight(el: HTMLElement) {
    if (!el) return 0;
    const styles = window.getComputedStyle(el);
    const margin =
        parseFloat(styles['marginTop']) + parseFloat(styles['marginBottom']);

    return Math.ceil(el.offsetHeight + margin);
}

export const calculateElDetails = (completeContentEl?: HTMLElement | null) => {
    if (!completeContentEl) return; // if no reference provided, return
    // select all elements with data print types
    const elList = completeContentEl.querySelectorAll('[data-print-type]');
    const elDetails: ElDetail[] = [];

    // handles CONTENT ElType
    const handleContentElType = (
        el: HTMLElement,
        type: string,
        childElDetails: ElDetail[],
    ) => {
        if (type !== ElType.CONTENT) return;
        const childSubContents = el.querySelectorAll(`[data-print-type]`); // CONTENT_HEADER & SUB_CONTENT & TEXT
        _forEach(childSubContents, (childEl: HTMLElement) => {
            const childHeight = getElementHeight(childEl);
            // don't push hidden elements (Height: 0)
            childHeight &&
                childElDetails.push({
                    type: childEl.dataset.printType || ElType.SUB_CONTENT,
                    id: childEl.dataset.printId || _uniqueId(),
                    height: childHeight,
                });
        });
    };
    // iterate over all elements
    _forEach(elList, (el: HTMLElement) => {
        const type = el.dataset.printType || ElType.CONTENT;
        const childElDetails: ElDetail[] = [];
        // if elType is content, handle children elDetails of content
        handleContentElType(el, type, childElDetails);
        // push elDetail if element has height
        const elementHeight = Math.max(
            getElementHeight(el),
            _getAllElementsHeightSum(childElDetails),
        ); // max of summation of content child elements height and the content height
        //don't push hidden elements (Height: 0)
        elementHeight &&
            elDetails.push({
                type,
                height: elementHeight,
                id: el.dataset.printId || type,
                pageBreak: el.dataset.printPageBreak,
                childElDetails: childElDetails.length
                    ? childElDetails
                    : undefined,
                fill:
                    el.dataset.printFill !== undefined &&
                    el.dataset.printFill !== 'false',
            });
    });

    return elDetails;
};

export const calculatePageDetailsOld = (
    elDetails: ElDetail[] | undefined,
    PAGE_MAX_HEIGHT: number,
    countAllSubHeaders?: boolean,
) => {
    if (!elDetails) return;

    //map of elDetails with elType
    const elDetailsTypeMap: MapOf<ElDetail[]> = {};
    _forEach(elDetails, (elDetail: ElDetail) => {
        const { type } = elDetail;
        if (!elDetailsTypeMap[type]) {
            elDetailsTypeMap[type] = [];
        }
        elDetailsTypeMap[type].push(elDetail);
    });

    //util - get the height of first element of given type
    const _getFirstElementTypeDetail = (type: ElType) =>
        _get(elDetailsTypeMap[type], '0');
    const _getHeightFromElDetail = (elDetail?: ElDetail) =>
        _get(elDetail, 'height', 0);

    //header footer and subheader details
    const headerElDetail = _getFirstElementTypeDetail(ElType.HEADER);
    const coverPageElDetail = _getFirstElementTypeDetail(ElType.COVER_PAGE);
    const subHeaderElDetail = _getFirstElementTypeDetail(ElType.SUB_HEADER);
    const footerElDetail = _getFirstElementTypeDetail(ElType.FOOTER);
    let subHeaderArray: ElDetail[] = [];

    const getInitialTotalHeightForPage = (currentPageIndex: number) => {
        let totalContentHeight =
            _getHeightFromElDetail(headerElDetail) +
            _getHeightFromElDetail(footerElDetail);
        if (currentPageIndex === 0 && coverPageElDetail) {
            totalContentHeight += _getHeightFromElDetail(coverPageElDetail);
        } else {
            subHeaderArray = elDetailsTypeMap[ElType.SUB_HEADER] || [];
            for (let i = 0; i < subHeaderArray.length; i++)
                totalContentHeight += _getHeightFromElDetail(subHeaderArray[i]);
        }
        return totalContentHeight;
    };

    const _completeCurrentPageDetails = (contentElDetail?: ElDetail) => {
        // complete previous page details
        pages[currentPageIndex].elDetails.push(footerElDetail);
        // update currentPageIndex
        currentPageIndex++;
        // add subheaders
        const subheader = countAllSubHeaders
            ? subHeaderArray
            : [subHeaderElDetail];
        // create a new page
        pages.push({
            // potential bug if one content is larger than PAGE_MAX_HEIGHT
            pageHeight:
                getInitialTotalHeightForPage(currentPageIndex) +
                _getHeightFromElDetail(contentElDetail),
            pageNumber: currentPageIndex + 1,
            elDetails: [headerElDetail, ...subheader].concat(
                contentElDetail || [],
            ),
        });
    };

    let addContentToPageFnCalled = 0; // to track number of recursion calls
    const MAX_RECURSION_CALL_LIMIT = 1000; // if this function is called recursively more than this number of times then stop calling the function
    const _addContentToPages = (contentElDetail: ElDetail) => {
        addContentToPageFnCalled++;

        const contentHeight = _getHeightFromElDetail(contentElDetail);
        if (!contentHeight) return;

        if (contentElDetail.pageBreak === 'true') {
            _completeCurrentPageDetails(contentElDetail);
            return;
        }

        const currentPageElDetails = pages[currentPageIndex]
            .elDetails as ElDetail[];
        if (
            pages[currentPageIndex].pageHeight + contentHeight <=
            PAGE_MAX_HEIGHT
        ) {
            currentPageElDetails.push(contentElDetail);
            pages[currentPageIndex].pageHeight += contentHeight;
            return;
        }

        if (
            !contentElDetail.childElDetails ||
            !contentElDetail.childElDetails?.length
        ) {
            _completeCurrentPageDetails(contentElDetail);
            return;
        }

        // if child details are present
        const contentElDetailsWithChild = _cloneDeep(
            contentElDetail,
        ) as ElDetail;
        let selectedChildren = 0;
        let selectedChildrenHeight = 0;
        let isPageMaxHeightLimitReached =
            pages[currentPageIndex].pageHeight >= PAGE_MAX_HEIGHT;
        let onlyHeaderFooterSelectedInCurrentPage = false;
        let childHeightMoreThanMaxLimitPosition = -1;
        _forEach(
            contentElDetailsWithChild.childElDetails,
            (subContentElDetail: ElDetail, index: number) => {
                if (isPageMaxHeightLimitReached) return;

                const subContentHeight =
                    _getHeightFromElDetail(subContentElDetail);

                if (
                    pages[currentPageIndex].pageHeight + subContentHeight <=
                    PAGE_MAX_HEIGHT
                ) {
                    pages[currentPageIndex].pageHeight += subContentHeight;
                    selectedChildrenHeight += subContentHeight;
                    selectedChildren++;
                } else {
                    isPageMaxHeightLimitReached = true;
                    // if no content is selected and page max limit is reached, child is larger than header,footer combined
                    if (
                        selectedChildren === 0 &&
                        !pages[currentPageIndex].elDetails.find(
                            (el) => el?.type === ElType.CONTENT,
                        )
                    ) {
                        childHeightMoreThanMaxLimitPosition = index;
                        onlyHeaderFooterSelectedInCurrentPage = true;
                    }
                    // if the child itself is larger than complete page
                    if (subContentHeight > PAGE_MAX_HEIGHT) {
                        childHeightMoreThanMaxLimitPosition = index;
                    }
                }
            },
        );

        if (selectedChildren > 0) {
            const selectedChildElDetails =
                contentElDetailsWithChild.childElDetails?.splice(
                    0,
                    selectedChildren,
                );
            contentElDetailsWithChild.height -= selectedChildrenHeight; // subtract height of selected sub content
            currentPageElDetails.push({
                ...contentElDetailsWithChild, // override height and childEl
                height: selectedChildrenHeight,
                childElDetails: selectedChildElDetails,
            });
        }

        if (childHeightMoreThanMaxLimitPosition !== -1) {
            !onlyHeaderFooterSelectedInCurrentPage &&
                _completeCurrentPageDetails();

            // we subtract selectedChildren from position as they were removed already from list of childElDetails
            const childEl = (contentElDetailsWithChild.childElDetails?.splice(
                childHeightMoreThanMaxLimitPosition - selectedChildren,
                1,
            ) || [])[0] as ElDetail; // remove the child
            if (!childEl) {
                console.log(
                    'No overflow child element found! Issue in preview util logic for contents of ',
                    contentElDetailsWithChild,
                );
                return;
            }
            const childElHeight = _getHeightFromElDetail(childEl);
            pages[currentPageIndex].pageHeight += childElHeight;
            pages[currentPageIndex].elDetails.push({
                ...contentElDetailsWithChild, // override height and childEl
                height: childElHeight,
                childElDetails: [childEl],
            });
        }

        // after adding sub contents check if sub contents are still remaining
        if (!contentElDetailsWithChild.childElDetails?.length) {
            return;
        }

        // add a new page for remaining sub content
        if (isPageMaxHeightLimitReached) {
            _completeCurrentPageDetails();
        }

        // recursively add child sub content till all are added
        if (addContentToPageFnCalled === MAX_RECURSION_CALL_LIMIT) {
            console.log(
                `Max recursion called limit reached ${MAX_RECURSION_CALL_LIMIT}`,
            );

            return;
        }
        _addContentToPages(contentElDetailsWithChild);
    };

    let currentPageIndex = 0;
    const pages: Omit<PageDetail, 'totalPages'>[] = [
        {
            pageHeight: getInitialTotalHeightForPage(currentPageIndex),
            pageNumber: currentPageIndex + 1,
            elDetails: [headerElDetail, coverPageElDetail],
        },
    ];

    _forEach(elDetailsTypeMap[ElType.CONTENT], (contentElDetail: ElDetail) => {
        addContentToPageFnCalled = 0; // reset call counter
        _addContentToPages(contentElDetail);
    });

    pages[currentPageIndex].elDetails.push(footerElDetail);
    currentPageIndex++; // increase currentPageIndex to make it as totalPages

    return pages.map((page) => ({
        ...page,
        totalPages: currentPageIndex,
        elDetails: page.elDetails.filter(Boolean) as ElDetail[], // filter any empty elDetails
    })) as PageDetail[];
};

// get element height
const _getElementHeight = (el: ElDetail | undefined) => {
    if (!el) return 0;
    return _get(el, 'height');
};

// get element array height
const _getAllElementsHeightSum = (elDetails: ElDetail[]) =>
    _reduce(
        elDetails,
        (sum: number, elDetail: ElDetail) =>
            (sum += _getElementHeight(elDetail)),
        0,
    );

// get line height adjusted height for div
const _getLineHeightAdaptedDivHeight = (
    height: number,
    lineHeight: number = 24,
) => height - (height % lineHeight);

export const calculatePageDetails = (
    elDetails: ElDetail[] | undefined,
    pageHeight: number,
    padding: number = 24,
) => {
    if (!elDetails) return; //if no elDetails, return

    // basic page setup
    const pages: Omit<PageDetail, 'totalPages'>[] = [];
    const lineHeight = 24;
    let currentPage: number = 0;
    let currentHeight: number = 0;
    let contentsInCurrentPage: ElDetail[] = [];
    let childElementsInCurrentContent: ElDetail[] = [];

    // map of elDetails by corresponding elTypes
    const elTypeMap: MapOf<ElDetail[]> = {};
    _forEach(elDetails, (elDetail) => {
        if (!elTypeMap[elDetail.type]) elTypeMap[elDetail.type] = [];
        elTypeMap[elDetail.type].push(elDetail);
    });

    // header footer and subHeader elDetails (Repeat every page)
    const header = _first(elTypeMap[ElType.HEADER]);
    const footer = _first(elTypeMap[ElType.FOOTER]);
    const subHeader = _first(elTypeMap[ElType.SUB_HEADER]);

    //show only on first page
    const cover = _first(elTypeMap[ElType.COVER_PAGE]);

    // default height that will be occupied by header, footer, subHeader and padding on every page
    const initialHeight =
        _getElementHeight(header) +
        _getElementHeight(footer) +
        _getElementHeight(subHeader) +
        2 * padding; // padding is customly provided, this space will be kept empty on each page

    // available height for content on every page
    const availableHeightForContent = pageHeight - initialHeight;

    // handles cover page
    if (cover) {
        const coverHeight = _getElementHeight(cover);
        currentHeight += coverHeight - _getElementHeight(subHeader); // cover pages are not supposed to have subHeaders, so removing subHeader height from cover page
        contentsInCurrentPage.push(cover);
    }

    // util for creating new page
    const createNewPage = (currentContent?: ElDetail) => {
        // if content is available, and there are child elements of that content in the page, assign child elements to the content and push it in contents in current page
        if (currentContent && childElementsInCurrentContent.length)
            contentsInCurrentPage.push({
                ...currentContent,
                childElDetails: childElementsInCurrentContent,
                height: _getAllElementsHeightSum(childElementsInCurrentContent),
            });
        // adding header, subheader, content and footer as elDetails for page
        const pageElDetails: ElDetail[] = [
            header!,
            subHeader!,
            ...contentsInCurrentPage,
            footer!,
        ].filter(Boolean);
        // push the page with current details
        pages.push({
            pageNumber: currentPage + 1,
            elDetails: pageElDetails,
            pageHeight: _getAllElementsHeightSum(pageElDetails),
        });
        // increase page count and reset page related variables
        currentPage++;
        currentHeight = 0;
        contentsInCurrentPage = [];
        childElementsInCurrentContent = [];
    };

    // handle Content Header
    const handleContentHeader = (
        contentHeader: ContentHeaderTypes,
        elDetail: ElDetail,
        height: number,
    ) => {
        if (elDetail.type !== ElType.CONTENT_HEADER) return;
        _assign(contentHeader, { flag: true, elDetail, height });
        currentHeight += contentHeader.height;
    };

    // handle fitting child elements inside the page
    const handlePageFitChildElementsOfContent = (
        contentHeader: ContentHeaderTypes,
        elDetail: ElDetail,
        height: number,
    ) => {
        if (contentHeader.flag) {
            contentHeader.flag = false;
            childElementsInCurrentContent.push(contentHeader.elDetail!);
        }
        childElementsInCurrentContent.push(elDetail);
        currentHeight += height;
    };

    // handle overflowed text widget
    const handleOverflowedTextWidget = (
        elDetail: ElDetail,
        elHeight: number,
        currentContent: ElDetail,
    ) => {
        let coveredTextSectionHeight = 0;
        while (coveredTextSectionHeight < elHeight) {
            const height = _getLineHeightAdaptedDivHeight(
                availableHeightForContent - currentHeight,
            );
            const textContentHeight =
                coveredTextSectionHeight + height < elHeight
                    ? height
                    : _getLineHeightAdaptedDivHeight(
                          elHeight - coveredTextSectionHeight,
                      ) + lineHeight; // + lineHeight is to make sure there is one line buffer to provide seperation from next element
            childElementsInCurrentContent.push({
                ...elDetail,
                textHeight: coveredTextSectionHeight,
                height: textContentHeight,
            });
            coveredTextSectionHeight += _getLineHeightAdaptedDivHeight(height);
            currentHeight = textContentHeight;
            if (coveredTextSectionHeight < elHeight)
                createNewPage(currentContent);
        }
    };

    // handle overflowed content
    const handleOverflowedChildElementsOfContent = (
        contentHeader: ContentHeaderTypes,
        elDetail: ElDetail,
        height: number,
        currentContent: ElDetail,
    ) => {
        // if child overflows the page and is of type TEXT
        if (elDetail.type === ElType.TEXT) {
            handleOverflowedTextWidget(elDetail, height, currentContent);
            return;
        }
        createNewPage(currentContent);
        // if there is content following up from previous page, we add contentHeader to the child elements in current content
        if (contentHeader.elDetail) {
            contentHeader.flag = false;
            childElementsInCurrentContent.push(contentHeader.elDetail);
            currentHeight += contentHeader.height;
        }
        childElementsInCurrentContent.push(elDetail);
        currentHeight += height;
    };

    // handle subContents
    const handleChildElements = (currentContent: ElDetail) => {
        // content header basic setup
        const contentHeaderDetails: ContentHeaderTypes = {
            height: 0,
            flag: false,
            elDetail: null,
        };
        const childElements = currentContent.childElDetails;

        // iterating over children of content
        _forEach(childElements, (childElement) => {
            const childElementHeight = _getElementHeight(childElement);
            if (childElement.type === ElType.CONTENT_HEADER)
                handleContentHeader(
                    contentHeaderDetails,
                    childElement,
                    childElementHeight,
                );
            // handles contentHeaders
            else if (
                currentHeight + childElementHeight <=
                availableHeightForContent
            )
                handlePageFitChildElementsOfContent(
                    contentHeaderDetails,
                    childElement,
                    childElementHeight,
                );
            // handles content that could fit inside the page
            else
                handleOverflowedChildElementsOfContent(
                    contentHeaderDetails,
                    childElement,
                    childElementHeight,
                    currentContent,
                ); // handles overflowing children of the content
        });
    };

    const content = elTypeMap[ElType.CONTENT];

    // iterating over contents
    _forEach(content, (element) => {
        const elementHeight = _getElementHeight(element);
        // if element has no children
        if (!element.childElDetails) {
            if (currentHeight + elementHeight >= availableHeightForContent)
                createNewPage(); // if content overflows the page, create new page
            contentsInCurrentPage.push(element);
            currentHeight += elementHeight;
        } else handleChildElements(element);

        //handles child elements that are not assigned to any content or any page
        if (childElementsInCurrentContent.length) {
            // if fill property is enabled, the page will be left blank after the content
            if (element.fill) createNewPage(element);
            // assign child elements to a content and append them on contents in current page
            else
                contentsInCurrentPage.push({
                    ...element,
                    childElDetails: childElementsInCurrentContent,
                    height: _getAllElementsHeightSum(
                        childElementsInCurrentContent,
                    ),
                });
            childElementsInCurrentContent = []; // clear child elements in current content
        }
    });
    // handles remaining contents that are not assigned to any page
    if (contentsInCurrentPage.length) createNewPage();
    return _map(pages, (page) => ({ ...page, totalPages: pages.length }));
};
