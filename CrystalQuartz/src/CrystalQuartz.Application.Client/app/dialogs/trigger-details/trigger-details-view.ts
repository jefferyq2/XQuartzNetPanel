﻿import DialogViewBase from '../dialog-view-base';

import { TriggerDetailsViewModel } from './trigger-details-view-model';
import PropertyView from '../common/property-view';

import TEMPLATE from './trigger-details.tmpl.html';

import { RENDER_PROPERTIES } from '../common/object-browser';

export class TriggerDetailsView extends DialogViewBase<TriggerDetailsViewModel> {
    template = TEMPLATE;

    init(dom: js.IDom, viewModel:TriggerDetailsViewModel) {
        super.init(dom, viewModel);

        dom('.js_summary').observes(viewModel.summary, PropertyView);
        dom('.js_identity').observes(viewModel.identity, PropertyView);
        dom('.js_schedule').observes(viewModel.schedule, PropertyView);

        RENDER_PROPERTIES(dom('.js_jobDataMap'), viewModel.jobDataMap);

        viewModel.loadDetails();
    }
}