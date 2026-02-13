import { JSDOM } from "jsdom";

export class DOM {
  public static parseToHTML(str: string): Document {
    const dom = new JSDOM(str);
    return dom.window.document;
  }

  public static parseToString(doc: Document): string {
    return doc.documentElement.outerHTML;
  }

  public static htmlStringToElements(htmlString: string): HTMLElement[] {
    const dom = new JSDOM(htmlString.trim());
    return Array.from(dom.window.document.body.children) as HTMLElement[];
  }
}
