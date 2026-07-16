const API_URL =
    "https://script.google.com/macros/s/AKfycbybyeNt46YlHJR4RvH93rjkh3jfNYvFnD96rpV3HYLdCxkKMgLbtSjn-MG5-uRe2iXM/exec";

const API_TIMEOUT_MS = 15000;

const statusButtons = document.querySelectorAll(".status-btn");
const machineSelect = document.getElementById("machineSelect");

const popup = document.getElementById("finishPopup");
const statusPopup = document.getElementById("statusPopup");

const popupStatus = document.getElementById("popupStatus");
const statusRemark = document.getElementById("statusRemark");

const saveStatus = document.getElementById("saveStatus");
const cancelStatusPopup = document.getElementById("cancelStatusPopup");
const closeStatusPopup = document.getElementById("closeStatusPopup");

const saveFinish = document.getElementById("saveFinish");
const cancelPopup = document.getElementById("cancelPopup");
const closePopup = document.getElementById("closePopup");

const coatedLength = document.getElementById("coatedLength");
const coatedLengthUnit = document.getElementById("coatedLengthUnit");
const coatedWidth = document.getElementById("coatedWidth");

const gsmLeft = document.getElementById("gsmLeft");
const gsmCenter = document.getElementById("gsmCenter");
const gsmRight = document.getElementById("gsmRight");

const thicknessLeft = document.getElementById("thicknessLeft");
const thicknessCenter = document.getElementById("thicknessCenter");
const thicknessRight = document.getElementById("thicknessRight");

const queueTableBody = document.querySelector("#queueTable tbody");
const nextStatus = document.getElementById("nextStatus");

let selectedMachine = machineSelect.value || "เครื่อง 1";
let selectedStatus = "";
let selectedNextQueue = null;


async function postApi(payload, options = {}) {
    const controller = options.controller || new AbortController();

    const timeoutId = setTimeout(() => {
        controller.abort();
    }, options.timeout || API_TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        if (!response.ok) {
            throw new Error(
                "เชื่อมต่อระบบไม่สำเร็จ (" + response.status + ")"
            );
        }

        const result = await response.json();

        if (!result || typeof result !== "object") {
            throw new Error("ข้อมูลที่ได้รับจากระบบไม่ถูกต้อง");
        }

        return result;

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง");
        }

        if (!navigator.onLine) {
            throw new Error("ไม่พบการเชื่อมต่ออินเทอร์เน็ต");
        }

        throw error;

    } finally {
        clearTimeout(timeoutId);
    }
}


function isPopupOpen() {
    return popup.classList.contains("show") ||
        statusPopup.classList.contains("show");
}


function setStatusButtonsDisabled(disabled) {
    statusButtons.forEach(button => {
        button.disabled = disabled;
    });
}


function showValue(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    return String(value);
}


function addUnit(value, unit) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    return String(value) + " " + unit;
}


function combineValueUnit(value, unit) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "-";
    }

    return String(value) + (unit ? " " + unit : "");
}


function formatDate(dateString) {
    if (!dateString) {
        return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("th-TH", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}


function updateActiveStatusButton(status) {
    const currentStatus = String(status || "").trim();

    statusButtons.forEach(button => {
        button.classList.remove("active");

        if (
            button.dataset.status &&
            button.dataset.status.trim() === currentStatus
        ) {
            button.classList.add("active");
        }
    });
}


function setCurrentStatusColor(status) {
    const statusContainer = document.querySelector(".current-status");
    const statusText = document.getElementById("currentStatusText");
    const currentStatus = String(status || "").trim();

    statusContainer.classList.remove(
        "status-green",
        "status-yellow",
        "status-red",
        "status-blue"
    );

    statusText.innerText = showValue(currentStatus);

    if (currentStatus === "รอดำเนินงาน") {
        statusContainer.classList.add("status-green");

    } else if (currentStatus === "กำลังดำเนินงาน") {
        statusContainer.classList.add("status-yellow");

    } else if (currentStatus === "เสร็จสิ้น") {
        statusContainer.classList.add("status-blue");

    } else if (currentStatus !== "" && currentStatus !== "-") {
        statusContainer.classList.add("status-red");
    }
}


function clearCurrentProduction() {
    const ids = [
        "orderNo",
        "workNo",
        "customer",
        "worker",
        "fabricNo",
        "color",
        "thickness",
        "width",
        "weight",
        "machine",
        "speed",
        "orderLength",
        "rollCount",
        "totalLength",
        "forecast",
        "startDate",
        "dueDate"
    ];

    ids.forEach(id => {
        const element = document.getElementById(id);

        if (element) {
            element.innerText = "-";
        }
    });

    setCurrentStatusColor("-");
    statusButtons.forEach(button => button.classList.remove("active"));
}


function clearFinishForm() {
    coatedLength.value = "";
    coatedLengthUnit.value = "เมตร";
    coatedWidth.value = "";

    gsmLeft.value = "";
    gsmCenter.value = "";
    gsmRight.value = "";

    thicknessLeft.value = "";
    thicknessCenter.value = "";
    thicknessRight.value = "";
}


function resetQueueSelection() {
    selectedNextQueue = null;
    queueTableBody.innerHTML = "";

    nextStatus.value = "รอดำเนินงาน";
    nextStatus.disabled = true;
}


function closeFinishPopup() {
    popup.classList.remove("show");
    resetQueueSelection();
    clearFinishForm();
}


function openFinishPopup() {
    resetQueueSelection();
    popup.classList.add("show");
    loadQueueList();
}


function validateFinishNumber(input, label) {
    const rawValue = String(input.value || "").trim();
    const value = Number(rawValue);

    if (
        rawValue === "" ||
        !Number.isFinite(value) ||
        value < 0
    ) {
        throw new Error(
            label + " ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป"
        );
    }

    return value;
}


function getFinishPayload(workNo) {
    return {
        action: "finishOrder",
        machine: selectedMachine,
        workNo: workNo,
        nextQueue: selectedNextQueue,
        nextStatus: nextStatus.disabled
            ? "รอดำเนินงาน"
            : nextStatus.value,
        coatedLength: validateFinishNumber(
            coatedLength,
            "Coated Length"
        ),
        coatedLengthUnit: coatedLengthUnit.value,
        coatedWidth: validateFinishNumber(
            coatedWidth,
            "Coated Width"
        ),
        gsmLeft: validateFinishNumber(gsmLeft, "GSM ซ้าย"),
        gsmCenter: validateFinishNumber(gsmCenter, "GSM กลาง"),
        gsmRight: validateFinishNumber(gsmRight, "GSM ขวา"),
        thicknessLeft: validateFinishNumber(
            thicknessLeft,
            "Thickness ซ้าย"
        ),
        thicknessCenter: validateFinishNumber(
            thicknessCenter,
            "Thickness กลาง"
        ),
        thicknessRight: validateFinishNumber(
            thicknessRight,
            "Thickness ขวา"
        )
    };
}


async function loadRunningOrder() {
    const machineAtRequest = selectedMachine;
    const requestId = (loadRunningOrder.requestId || 0) + 1;

    loadRunningOrder.requestId = requestId;

    if (loadRunningOrder.controller) {
        loadRunningOrder.controller.abort();
    }

    const controller = new AbortController();
    loadRunningOrder.controller = controller;

    machineSelect.disabled = true;
    setStatusButtonsDisabled(true);

    try {
        const data = await postApi({
            action: "getRunningOrder",
            machine: machineAtRequest
        }, {
            controller: controller
        });

        if (
            requestId !== loadRunningOrder.requestId ||
            machineAtRequest !== selectedMachine
        ) {
            return;
        }

        if (!data.success) {
            clearCurrentProduction();

            document.getElementById("machine").innerText =
                machineAtRequest;

            document.getElementById("currentStatusText").innerText =
                "ไม่มีงาน";

            return;
        }

        document.getElementById("orderNo").innerText =
            showValue(data.orderNo);

        document.getElementById("workNo").innerText =
            showValue(data.workNo);

        document.getElementById("customer").innerText =
            showValue(data.customer);

        document.getElementById("worker").innerText =
            showValue(data.worker);

        document.getElementById("fabricNo").innerText =
            showValue(data.fabric);

        document.getElementById("color").innerText =
            showValue(data.color);

        document.getElementById("thickness").innerText =
            addUnit(data.thickness, "mm");

        document.getElementById("width").innerText =
            addUnit(data.width, "นิ้ว");

        document.getElementById("weight").innerText =
            addUnit(data.gsm, "g/m²");

        document.getElementById("machine").innerText =
            showValue(data.machine);

        document.getElementById("speed").innerText =
            addUnit(data.speed, "เมตร/นาที");

        document.getElementById("orderLength").innerText =
            combineValueUnit(
                data.orderLength,
                data.orderLengthUnit
            );

        document.getElementById("rollCount").innerText =
            showValue(data.rollCount);

        document.getElementById("totalLength").innerText =
            combineValueUnit(
                data.totalLength,
                data.totalLengthUnit
            );

        document.getElementById("forecast").innerText =
            showValue(data.forecast);

        document.getElementById("startDate").innerText =
            formatDate(data.startDate);

        document.getElementById("dueDate").innerText =
            formatDate(data.dueDate);

        setCurrentStatusColor(data.status);
        updateActiveStatusButton(data.status);

    } catch (error) {
        if (
            error.name !== "AbortError" &&
            machineAtRequest === selectedMachine
        ) {
            console.error(error);

            document.getElementById("currentStatusText").innerText =
                error.message || "โหลดข้อมูลไม่สำเร็จ";
        }

    } finally {
        if (loadRunningOrder.controller === controller) {
            loadRunningOrder.controller = null;
        }

        if (requestId === loadRunningOrder.requestId) {
            machineSelect.disabled = false;
            setStatusButtonsDisabled(false);
        }
    }
}


async function updateStatus(status, remark) {
    const workNo = document
        .getElementById("workNo")
        .innerText
        .trim();

    if (workNo === "" || workNo === "-") {
        alert(selectedMachine + " ยังไม่มีงาน");
        return false;
    }

    setStatusButtonsDisabled(true);

    try {
        const result = await postApi({
            action: "updateStatus",
            machine: selectedMachine,
            workNo: workNo,
            status: status,
            remark: String(remark || "").trim()
        });

        if (!result.success) {
            alert(result.message || "อัปเดตสถานะไม่สำเร็จ");
            await loadRunningOrder();
            return false;
        }

        await loadRunningOrder();
        return true;

    } catch (error) {
        console.error(error);
        alert(error.message || "อัปเดตสถานะไม่สำเร็จ");
        return false;

    } finally {
        setStatusButtonsDisabled(false);
    }
}


function renderQueueTable(queueList) {
    resetQueueSelection();

    if (
        !Array.isArray(queueList) ||
        queueList.length === 0
    ) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent = "ไม่มีคิวถัดไป";
        cell.style.cursor = "default";

        row.appendChild(cell);
        queueTableBody.appendChild(row);
        return;
    }

    nextStatus.disabled = false;

    queueList.forEach((job, index) => {
        const row = document.createElement("tr");

        [
            job.queue,
            job.workNo,
            job.orderNo,
            job.customer
        ].forEach(value => {
            const cell = document.createElement("td");

            cell.textContent = showValue(value);
            row.appendChild(cell);
        });

        row.addEventListener("click", () => {
            queueTableBody.querySelectorAll("tr").forEach(item => {
                item.classList.remove("selected");
            });

            row.classList.add("selected");
            selectedNextQueue = Number(job.queue);
        });

        queueTableBody.appendChild(row);

        if (index === 0) {
            row.classList.add("selected");
            selectedNextQueue = Number(job.queue);
        }
    });
}


async function loadQueueList() {
    resetQueueSelection();

    const loadingRow = document.createElement("tr");
    const loadingCell = document.createElement("td");

    loadingCell.colSpan = 4;
    loadingCell.textContent = "กำลังโหลดคิว...";
    loadingRow.appendChild(loadingCell);
    queueTableBody.appendChild(loadingRow);

    try {
        const result = await postApi({
            action: "getQueueList",
            machine: selectedMachine
        });

        if (!result.success) {
            throw new Error(
                result.message || "โหลดคิวไม่สำเร็จ"
            );
        }

        renderQueueTable(result.data);

    } catch (error) {
        console.error(error);
        resetQueueSelection();

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent =
            error.message || "โหลดคิวไม่สำเร็จ";

        row.appendChild(cell);
        queueTableBody.appendChild(row);
    }
}


machineSelect.addEventListener("change", async () => {
    selectedMachine = machineSelect.value;

    document.getElementById("currentStatusText").innerText =
        "กำลังโหลดข้อมูล...";

    await loadRunningOrder();
});


statusButtons.forEach(button => {
    button.addEventListener("click", async () => {
        if (button.disabled) {
            return;
        }

        const workNo = document
            .getElementById("workNo")
            .innerText
            .trim();

        if (workNo === "" || workNo === "-") {
            alert(
                selectedMachine +
                " ยังไม่มีงานอยู่หน้าเครื่อง"
            );
            return;
        }

        if (button.classList.contains("finish")) {
            openFinishPopup();
            return;
        }

        const status = button.dataset.status;
        selectedStatus = status;

        if (status === "กำลังดำเนินงาน") {
            await updateStatus(status, "");
            return;
        }

        popupStatus.value = status;
        statusRemark.value = "";
        statusPopup.classList.add("show");
    });
});


cancelPopup.onclick = closeFinishPopup;
closePopup.onclick = closeFinishPopup;

popup.addEventListener("click", event => {
    if (event.target === popup) {
        closeFinishPopup();
    }
});


cancelStatusPopup.onclick = () => {
    statusPopup.classList.remove("show");
};

closeStatusPopup.onclick = () => {
    statusPopup.classList.remove("show");
};

statusPopup.addEventListener("click", event => {
    if (event.target === statusPopup) {
        statusPopup.classList.remove("show");
    }
});


saveStatus.onclick = async () => {
    if (saveStatus.disabled) {
        return;
    }

    saveStatus.disabled = true;
    saveStatus.textContent = "กำลังบันทึก...";

    try {
        const success = await updateStatus(
            selectedStatus,
            statusRemark.value
        );

        if (success) {
            statusPopup.classList.remove("show");
        }

    } finally {
        saveStatus.disabled = false;
        saveStatus.textContent = "บันทึก";
    }
};


saveFinish.addEventListener("click", async () => {
    if (saveFinish.disabled) {
        return;
    }

    const workNo = document
        .getElementById("workNo")
        .innerText
        .trim();

    if (workNo === "" || workNo === "-") {
        alert(selectedMachine + " ไม่มีงานที่สามารถปิดได้");
        return;
    }

    let payload;

    try {
        payload = getFinishPayload(workNo);

    } catch (error) {
        alert(error.message);
        return;
    }

    saveFinish.disabled = true;
    saveFinish.textContent = "กำลังบันทึก...";

    try {
        const result = await postApi(payload);

        if (!result.success) {
            alert(result.message || "ปิดงานไม่สำเร็จ");
            return;
        }

        closeFinishPopup();
        await loadRunningOrder();

        alert(result.message || "ปิดงานเรียบร้อย");

    } catch (error) {
        console.error(error);
        alert(error.message || "ปิดงานไม่สำเร็จ");

    } finally {
        saveFinish.disabled = false;
        saveFinish.textContent = "บันทึก";
    }
});


setInterval(() => {
    if (
        !isPopupOpen() &&
        !loadRunningOrder.controller
    ) {
        loadRunningOrder();
    }
}, 12000);


loadRunningOrder();