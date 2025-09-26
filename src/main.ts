import { createAppContainer } from './container';

const { controller, view } = createAppContainer();
view.initialize(controller);
