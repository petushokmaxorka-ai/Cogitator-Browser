// Electron <webview> tag (renderer)
import type { WebviewTag } from 'electron';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<
        React.HTMLAttributes<WebviewTag>,
        WebviewTag
      > & {
        src?: string;
        preload?: string;
        partition?: string;
        webpreferences?: string;
        allowpopups?: string | boolean;
        httpreferrer?: string;
        useragent?: string;
      };
    }
  }

  namespace Electron {
    interface WebviewTag extends HTMLElement {
      src: string;
      preload: string;
      loadURL(url: string): void;
      goBack(): void;
      goForward(): void;
      reload(): void;
      canGoBack(): boolean;
      canGoForward(): boolean;
      addEventListener(
        type: 'new-window',
        listener: (event: NewWindowWebContentsEvent) => void,
      ): void;
      removeEventListener(
        type: 'new-window',
        listener: (event: NewWindowWebContentsEvent) => void,
      ): void;
    }

    interface NewWindowWebContentsEvent extends Event {
      preventDefault(): void;
      url: string;
    }
  }
}

export {};
