import * as React from 'react';
import { calculateElDetails, calculatePageDetails } from './printPreviewUtils';
import { ElDetail, PageDetail } from './printPreviewTypes';

interface Props {
    height: number;
    dynamicChild?: boolean;
    renderComponent(pageDetail?: PageDetail): React.ReactNode;
}

interface State {
    elDetails: ElDetail[];
    pages?: PageDetail[];
}

// all "ElDetail" keys should have html attribute as "data-print-" (like: data-print-type, data-print-id etc.)
class PrintPreview extends React.Component<Props> {
    state: State = {
        elDetails: [],
    };

    completeContentRef = React.createRef<HTMLDivElement>();
    // @ts-ignore
    resizeObserver: window.ResizeObserver;

    componentDidMount() {
        if (this.props.dynamicChild) {
            // @ts-ignore
            this.resizeObserver = new window.ResizeObserver(() => {
                this.calculatePages();
            });
            this.resizeObserver.observe(this.completeContentRef.current);
        }
        this.calculatePages();
    }

    componentWillUnmount() {
        if (this.resizeObserver)
            this.resizeObserver.unobserve(this.completeContentRef.current);
    }

    calculatePages = () => {
        const elDetails = calculateElDetails(this.completeContentRef.current);
        const pages = calculatePageDetails(elDetails, this.props.height);
        this.setState({ pages, elDetails });
    };

    render() {
        const { props, state } = this,
            { dynamicChild } = props;
        // if pages are calculated render them as page
        if (state.pages && state.pages.length) {
            return (
                <>
                    {dynamicChild && (
                        <div
                            className="absolute opacity-0"
                            style={{ left: -10000 }}
                            ref={this.completeContentRef}
                        >
                            {props.renderComponent()}
                        </div>
                    )}
                    {state.pages.map((p) => props.renderComponent(p))}
                </>
            );
        }

        // initially render the complete component without any page information to get individual elements height
        return (
            <div ref={this.completeContentRef}>{props.renderComponent()}</div>
        );
    }
}

export default PrintPreview;
