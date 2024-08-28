import { app } from "@/app/app";
import "./style.css";
import { StreamSink } from "sodiumjs";
import { Duration } from "./app/types";

const main = () => {
  const ssink_tick = new StreamSink<Duration>();

  setInterval(() => {
    ssink_tick.send(Duration.fromMs(200));
  }, 200);

  const root = app(ssink_tick);
  root.render(document.querySelector<HTMLDivElement>("#app")!);
};

main();
