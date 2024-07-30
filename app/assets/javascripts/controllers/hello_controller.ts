import StimulusController from "../lib/stimulus_controller";

export default class extends StimulusController<HTMLFormElement> {
  connect() {
    console.log("Hello from hello_controller.ts");
  }
}
