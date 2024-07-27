import { app } from "@/app/app";
import "./style.css";
import { StreamSink, Unit } from "sodiumjs";

const main = () => {
  const ssink_tick = new StreamSink<Unit>();
  setInterval(() => {
    ssink_tick.send(Unit.UNIT);
  }, 200);

  const root = app(ssink_tick);
  root.render(document.querySelector<HTMLDivElement>("#app")!);
};

main();
