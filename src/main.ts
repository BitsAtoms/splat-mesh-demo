import "./styles.css";
import { App } from "./app";
import { byId } from "./ui/dom";

new App(byId<HTMLCanvasElement>("c")).start();
