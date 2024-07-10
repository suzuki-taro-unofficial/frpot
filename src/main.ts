import { app } from "./app";
import "./style.css";

const root = app();
root.render(document.querySelector<HTMLDivElement>("#app")!);
