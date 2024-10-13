/** @odoo-module **/

import { formView } from "@web/views/form/form_view";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { FormController } from "@web/views/form/form_controller";
import { useSubEnv } from "@odoo/owl"
import { _t } from "@web/core/l10n/translation";

export class selectPrinterFormController extends FormController {
    setup () {
        super.setup();
        this.notification = useService("notification");
        
        this.onClickViewButton = this.env.onClickViewButton;
        
        useSubEnv({onClickViewButton: this.onClickViewButtonIoT.bind(this)});
    }

    async onClickViewButtonIoT(params) {
        let selected_devices = this.model.root.evalContextWithVirtualIds.device_ids;
        if (selected_devices.length > 0) {
            this.env.services.iot_websocket.setJobInLocalStorage(selected_devices,
                [this.props.context.report_id, this.props.context.res_ids, this.props.context.data, this.props.context.print_id]);
            this.onClickViewButton(params);
        } else {
            this.notification.add(_t("Select at least one printer"), {
                title: _t("No printer selected"),
                type: "danger",
            });
        }
    }

}

export const selectPrinterForm = {
    ...formView,
    Controller: selectPrinterFormController,
}

registry.category("views").add('select_printers_wizard', selectPrinterForm);