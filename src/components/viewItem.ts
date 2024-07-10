export interface ViewItem<H extends HTMLElement = HTMLElement> {
  render(target: Element): void;
  getElement(): H;
  appendChildren(...viewItems: ViewItem[]): ViewItem<H>;
}
