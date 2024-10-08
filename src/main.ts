import { app } from "@/app/app";
import "./style.css";
import { StreamSink } from "sodiumjs";

const main = () => {
  const ssink_tick = new StreamSink<number>();

  setInterval(() => {
    ssink_tick.send(200);
  }, 200);

  const root = app(ssink_tick);
  root.render(document.querySelector<HTMLDivElement>("#app")!);
};

main();
