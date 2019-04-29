﻿import Timeline from './timeline';
import TimelineTickView from './timeline-tick-view';

export default class TimelineCaptionsView implements js.IView<Timeline> {
    template = '<ul class="timeline-captions"></ul>';

    init(dom: js.IDom, timeline: Timeline) {
        const $ticks = dom('.timeline-captions');
        $ticks.observes(timeline.ticks.items, TimelineTickView);
        $ticks.$.css('width', (100 + 100 * timeline.ticks.millisecondsPerTick / timeline.timelineSizeMilliseconds) + '%');

        const wire = timeline.ticks.shift.listen(shiftPercent => {
            $ticks.$.css('left', (- shiftPercent) + '%');
        });

        dom.manager.manage(wire);
    }
}