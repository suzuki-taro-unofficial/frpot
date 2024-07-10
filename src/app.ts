import Button from "./components/button";

export const app = (element: HTMLDivElement) => {
  const okButton = new Button("ok");
  const cancelButton = new Button("cancel");

  element.innerHTML = `
    <h1>Hello world!</h1>
  `;
};
