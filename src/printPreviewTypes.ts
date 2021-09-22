export enum ElType {
    HEADER = 'HEADER',
    SUB_HEADER = 'SUB_HEADER', // for subsequent pages
    COVER_PAGE = 'COVER_PAGE', // only on page 1
    CONTENT = 'CONTENT',
    CONTENT_HEADER = 'CONTENT_HEADER', // header for specific content
    SUB_CONTENT = 'SUB_CONTENT',
    FOOTER = 'FOOTER',
    TEXT = 'TEXT', // simple text or rich text
}

export interface ElDetail {
    type: string;
    id: string;
    height: number;
    childElDetails?: ElDetail[];
    fill?: boolean;
    textHeight?: number;
    overflow?: boolean;
    pageBreak?: string;
}

export interface PageDetail {
    pageNumber: number;
    totalPages: number;
    pageHeight: number;
    elDetails: ElDetail[];
}

enum ConvertType {
    INCHES_TO_PIXELS = 'INCHES_TO_PIXELS',
}

const convertData = (value: any, type: ConvertType) => {
    switch (type) {
        case ConvertType.INCHES_TO_PIXELS:
            return value * 96; // 1 inch = 96 pixel
        default:
            return value;
    }
};

export const PAGE_DIMENSIONS = {
    A4_LANDSCAPE: {
        height: convertData(8.2677, ConvertType.INCHES_TO_PIXELS),
        width: convertData(11.6929, ConvertType.INCHES_TO_PIXELS),
    },
    A4: {
        height: convertData(11.6929, ConvertType.INCHES_TO_PIXELS),
        width: convertData(8.2677, ConvertType.INCHES_TO_PIXELS),
    },
};
