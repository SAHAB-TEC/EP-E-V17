/** @odoo-module **/
/* eslint-disable no-undef */

import publicWidget from "@web/legacy/js/public/public_widget";
import { _t } from "@web/core/l10n/translation";
const { DateTime } = luxon;

publicWidget.registry.PlanningView = publicWidget.Widget.extend({
    selector: '#calendar_employee',
    jsLibs: [
        '/web/static/lib/fullcalendar/core/main.js',
        '/web/static/lib/fullcalendar/core/locales-all.js',
        '/web/static/lib/fullcalendar/interaction/main.js',
        '/web/static/lib/fullcalendar/daygrid/main.js',
        '/web/static/lib/fullcalendar/timegrid/main.js',
        '/web/static/lib/fullcalendar/list/main.js'
    ],
    cssLibs: [
        '/web/static/lib/fullcalendar/core/main.css',
        '/web/static/lib/fullcalendar/daygrid/main.css',
        '/web/static/lib/fullcalendar/timegrid/main.css',
        '/web/static/lib/fullcalendar/list/main.css'
    ],

    init: function (parent, options) {
        this._super.apply(this, arguments);
    },
    start: function () {
        if ($('.message_slug').attr('value')) {
            $("#PlanningToast").toast('show');
        }
        this._super.apply(this, arguments);
        // The calendar is displayed if there are slots (open or not)
        if ($('.no_data').attr('value')) {
            return;
        }
        this.calendarElement = this.$(".o_calendar_widget")[0];
        const employeeSlotsFcData = JSON.parse($('.employee_slots_fullcalendar_data').attr('value'));
        const openSlotsIds = $('.open_slots_ids').attr('value');
        const locale = $('.locale').attr('value');
        // initialise popovers and add the event listeners
        $('[data-bs-toggle="popover"]').popover();
        // code used to dismiss popover when clicking outside of it
        $('body').on('click', function (e) {
            var parentElsClassList = $(e.target).parents().map(function() {
                return [...this.classList];
            })
            if (!['assignee-cell', 'contact-assignee-popover'].some(el => [...parentElsClassList].includes(el))) {
                $('[data-bs-toggle="popover"]').popover('hide');
            }
        });
        // code used to dismiss popover when opening another popover
        $('[data-bs-toggle="popover"]').on('click', function (e) {
            $('[data-bs-toggle="popover"]').not(this).popover('hide');
        });
        // default date: first event of either assigned slots or open shifts
        const defaultStartValue = $('.default_start').attr('value'); //yyyy-MM-dd
        const defaultView = $('.default_view').attr('value');
        const minTime = $('.mintime').attr('value'); //HH:mm:ss
        const maxTime = $('.maxtime').attr('value'); //HH:mm:ss
        let calendarHeaders = {
            left: 'dayGridMonth,timeGridWeek,listMonth',
            center: 'title',
            right: 'today,prev,next',
        };
        if (employeeSlotsFcData.length === 0) {
            // There are no event to display. This is probably an empty slot sent for assignment
            calendarHeaders = {
                left: false,
                center: 'title',
                right: false,
            };
        }
        const titleFormat = { month: "long", year: "numeric" };
        // The calendar is displayed if there are slots (open or not)
        if (defaultView && defaultStartValue && (employeeSlotsFcData || openSlotsIds)) {
            this.calendar = new FullCalendar.Calendar($("#calendar_employee")[0], {
                // Settings
                plugins: ["luxon", "dayGrid", "timeGrid", "list", "interraction"],
                locale: locale,
                defaultView: defaultView,
                navLinks: true, // can click day/week names to navigate views
                eventLimit: 3, // allow "more" link when too many events
                titleFormat: titleFormat,
                defaultDate: DateTime.fromFormat(defaultStartValue, "yyyy-MM-dd").toJSDate(),
                timeFormat: 'LT',
                displayEventEnd: true,
                height: 'auto',
                eventRender: this.eventRenderFunction,
                eventTextColor: 'white',
                eventOverlap: true,
                eventTimeFormat: {
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'long',
                    omitZeroMinute: true,
                },
                minTime: minTime,
                maxTime: maxTime,
                header: calendarHeaders,
                // Data
                events: employeeSlotsFcData,
                // Event Function is called when clicking on the event
                eventClick: this.eventFunction.bind(this),
                buttonText: {
                    today: _t("Today"),
                    dayGridMonth: _t("Month"),
                    timeGridWeek: _t("Week"),
                    listMonth: _t("List"),
                },
                noEventsMessage: '',
            });
            this.calendar.setOption('locale', locale);
            this.calendar.render();
        }
    },
    eventRenderFunction: function (calRender) {
        const eventContent = calRender.el.querySelectorAll('.fc-time, .fc-title');
        if (calRender.view.type != 'listMonth') {
            calRender.el.classList.add('px-2', 'py-1');
        }
        if (calRender.view.type === 'dayGridMonth') {
            for (let i = 0; i < eventContent.length; i++) {
                eventContent[i].classList.add('d-block', 'text-truncate');
            }
        }
        calRender.el.classList.add('cursor-pointer');
        calRender.el.childNodes[0].classList.add('fw-bold');
        if (calRender.event.extendedProps.request_to_switch && !calRender.event.extendedProps.allow_self_unassign) {
            calRender.el.style.borderColor = 'rgb(255, 172, 0)';
            calRender.el.style.borderWidth = '5px';
            calRender.el.style.opacity = '0.7';
        }
    },
    formatDateAsBackend: function (date) {
        return DateTime.fromJSDate(date).toLocaleString({
            ...DateTime.DATE_SHORT,
            ...DateTime.TIME_24_SIMPLE,
            weekday: "short",
        });
    },
    eventFunction: function (calEvent) {
        const planningToken = $('.planning_token').attr('value');
        const employeeToken = $('.employee_token').attr('value');
        let displayFooter = false;
        $(".modal-title").text(calEvent.event.title);
        $(".modal-header").css("background-color", calEvent.event.backgroundColor);
        if (calEvent.event.extendedProps.request_to_switch && !calEvent.event.extendedProps.allow_self_unassign) {
            document.getElementById("switch-warning").style.display = "block";
            $(".warning-text").text("You requested to switch this shift. Other employees can now assign themselves to it.");
        } else {
            document.getElementById("switch-warning").style.display = "none";
        }
        $('.o_start_date').text(this.formatDateAsBackend(calEvent.event.start));
        let textValue = this.formatDateAsBackend(calEvent.event.end);
        if (calEvent.event.extendedProps.alloc_hours) {
            textValue += ` (${calEvent.event.extendedProps.alloc_hours})`;
        }
        if (parseFloat(calEvent.event.extendedProps.alloc_perc) < 100) {
            textValue += ` (${calEvent.event.extendedProps.alloc_perc}%)`;
        }
        $('.o_end_date').text(textValue);
        if (calEvent.event.extendedProps.role) {
            $("#role").prev().css("display", "");
            $("#role").text(calEvent.event.extendedProps.role);
            $("#role").css("display", "");
        } else {
            $("#role").prev().css("display", "none");
            $("#role").css("display", "none");
        }
        if (calEvent.event.extendedProps.note) {
            $("#note").prev().css("display", "");
            $("#note").text(calEvent.event.extendedProps.note);
            $("#note").css("display", "");
        } else {
            $("#note").prev().css("display", "none");
            $("#note").css("display", "none");
        }
        $("#allow_self_unassign").text(calEvent.event.extendedProps.allow_self_unassign);
        if (
            calEvent.event.extendedProps.allow_self_unassign
            && !calEvent.event.extendedProps.is_unassign_deadline_passed
            ) {
            document.getElementById("dismiss_shift").style.display = "block";
            displayFooter = true;
        } else {
            document.getElementById("dismiss_shift").style.display = "none";
        }
        if (
            !calEvent.event.extendedProps.request_to_switch
            && !calEvent.event.extendedProps.is_past
            && !calEvent.event.extendedProps.allow_self_unassign
            ) {
            document.getElementById("switch_shift").style.display = "block";
            displayFooter = true;
        } else {
            document.getElementById("switch_shift").style.display = "none";
        }
        if (
            calEvent.event.extendedProps.request_to_switch
            && !calEvent.event.extendedProps.allow_self_unassign
            ) {
            document.getElementById("cancel_switch").style.display = "block";
            displayFooter = true;
        } else {
            document.getElementById("cancel_switch").style.display = "none";
        }
        $("#modal_action_dismiss_shift").attr("action", "/planning/" + planningToken + "/" + employeeToken + "/unassign/" + calEvent.event.extendedProps.slot_id);
        $("#modal_action_switch_shift").attr("action", "/planning/" + planningToken + "/" + employeeToken + "/switch/" + calEvent.event.extendedProps.slot_id);
        $("#modal_action_cancel_switch").attr("action", "/planning/" + planningToken + "/" + employeeToken + "/cancel_switch/" + calEvent.event.extendedProps.slot_id);
        $("#fc-slot-onclick-modal").modal("show");
        document.getElementsByClassName("modal-footer")[0].style.display = displayFooter ? "block" : "none" ;
    },
});

// Add client actions
export default publicWidget.registry.PlanningView;
