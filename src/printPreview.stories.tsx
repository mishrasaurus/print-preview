import _cloneDeep from 'lodash/cloneDeep';
import _random from 'lodash/random';
import _times from 'lodash/times';
import * as React from 'react';
import { ElType, PageDetail, PAGE_DIMENSIONS } from './printPreviewTypes';
import PrintPreviewComponent from './printPreview';

const getPageDetailsConfig = (): PageDetail => ({
    pageNumber: 1,
    totalPages: 1,
    pageHeight: PAGE_DIMENSIONS.A4.height,
    elDetails: _times(7, (n) => {
        const height = _random(100, 1200);
        let childElDetails;

        if (height > 700) {
            const childElements = _random(2, 5); // create at least 2 children for element
            childElDetails = _times(childElements, (childIndex) => {
                return {
                    type: ElType.SUB_CONTENT,
                    height: height / childElements,
                    id: `${n + 1}_${childIndex + 1}`,
                };
            });
        }
        return {
            type: ElType.CONTENT,
            height,
            id: n + 1 + '',
            childElDetails,
        };
    }),
});

const COMPLETE_CONTENT_PAGE_DETAIL: PageDetail = getPageDetailsConfig();

class SampleExportHTML extends React.Component<
    { pageDetail?: PageDetail; dynamicChild?: boolean },
    { defaultConfig: PageDetail }
> {
    state = {
        defaultConfig: _cloneDeep(COMPLETE_CONTENT_PAGE_DETAIL),
    };

    componentDidMount() {
        // change internal components heights after rendering in case of dynamic child
        if (this.props.dynamicChild) {
            setTimeout(() => {
                this.setState({
                    defaultConfig: getPageDetailsConfig(),
                });
            }, 6000);
        }
    }

    renderHeader(pageDetail: PageDetail) {
        return (
            <div
                data-print-type={ElType.HEADER}
                style={{
                    height: 50,
                    border: '1px solid #E3E4E5',
                }}
                className={'flex items-center mb-20 p-10 justify-between'}
            >
                <div className="center-y">
                    <div className="ml-20 t-title text-secondary">
                        Sample Header
                    </div>
                </div>

                <div className="ml-auto t-body2 text-secondary">
                    Page {pageDetail.pageNumber} of {pageDetail.totalPages}
                </div>
            </div>
        );
    }

    renderContent(pageDetail: PageDetail) {
        return (
            pageDetail.elDetails &&
            pageDetail.elDetails.map((elDetail) =>
                elDetail && elDetail.type === ElType.CONTENT ? (
                    <div
                        data-print-type={ElType.CONTENT}
                        data-print-id={elDetail.id}
                        style={{
                            border: '1px solid #E3E4E5',
                            height: elDetail.height,
                        }}
                    >
                        {elDetail.childElDetails?.length ? (
                            elDetail.childElDetails.map((childElDetails) => (
                                <div
                                    data-print-type={ElType.SUB_CONTENT}
                                    data-print-id={childElDetails.id}
                                    className="center-x-y"
                                    style={{
                                        border: '1px dotted #E3E4E5',
                                        height: childElDetails.height,
                                    }}
                                >
                                    {childElDetails.id} -{' '}
                                    {childElDetails.height}
                                </div>
                            ))
                        ) : (
                            <div className="center-x-y h-full">
                                {elDetail.id} - {elDetail.height}
                            </div>
                        )}
                    </div>
                ) : null,
            )
        );
    }

    renderFooter(pageDetail: PageDetail) {
        return (
            <footer
                data-print-type={ElType.FOOTER}
                className="w-full py-10 center-x absolute bottom-0"
                style={{ border: '1px solid #E3E4E5' }}
            >
                Powered By Dino
            </footer>
        );
    }

    render() {
        const showCompleteContent = !this.props.pageDetail,
            pageDetail = this.props.pageDetail || this.state.defaultConfig;

        return (
            <div
                className="relative"
                style={{
                    height: showCompleteContent
                        ? undefined
                        : PAGE_DIMENSIONS.A4.height, // to get the complete height in case of full content
                    width: PAGE_DIMENSIONS.A4.width,
                    border: '1px solid',
                    marginBottom: 20,
                }}
            >
                {this.renderHeader(pageDetail)}
                {this.renderContent(pageDetail)}
                {this.renderFooter(pageDetail)}
            </div>
        );
    }
}

export default {
    title: 'Print Preview',
    component: SampleExportHTML,
};

export const PrintPreview = () => {
    return (
        <div className="flex">
            <div className="flex-1/2 p-10">
                <div className="t-h2 mb-20">Original</div>
                <SampleExportHTML />
            </div>
            <div className="flex-1/2 p-10">
                <div className="t-h2 mb-20">Preview</div>
                <PrintPreviewComponent
                    height={PAGE_DIMENSIONS.A4.height}
                    renderComponent={(p) => <SampleExportHTML pageDetail={p} />}
                />
            </div>
        </div>
    );
};
