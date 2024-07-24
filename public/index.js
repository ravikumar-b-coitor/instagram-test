
fetch("./data.json")
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        const statusContainer = document.getElementById("status-container");

        data.forEach(item => {
            const statusHTML = `
                <div>
                    <div class="centric d-flex align-items-center">
                        <div class="d-flex py-2 justify-content-center align-items-end gap-2">
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 18px; color: green;">
                                <path fill-rule="evenodd" clip-rule="evenodd"
                                    d="M8 1.5C6.27609 1.5 4.62279 2.18482 3.40381 3.40381C2.18482 4.62279 1.5 6.27609 1.5 8C1.5 8.85359 1.66813 9.69883 1.99478 10.4874C2.32144 11.2761 2.80022 11.9926 3.40381 12.5962C4.00739 13.1998 4.72394 13.6786 5.51256 14.0052C6.30117 14.3319 7.14641 14.5 8 14.5C8.85359 14.5 9.69883 14.3319 10.4874 14.0052C11.2761 13.6786 11.9926 13.1998 12.5962 12.5962C13.1998 11.9926 13.6786 11.2761 14.0052 10.4874C14.3319 9.69883 14.5 8.85359 14.5 8C14.5 6.27609 13.8152 4.62279 12.5962 3.40381C11.3772 2.18482 9.72391 1.5 8 1.5ZM2.34315 2.34315C3.84344 0.842855 5.87827 0 8 0C10.1217 0 12.1566 0.842855 13.6569 2.34315C15.1571 3.84344 16 5.87827 16 8C16 9.05058 15.7931 10.0909 15.391 11.0615C14.989 12.0321 14.3997 12.914 13.6569 13.6569C12.914 14.3997 12.0321 14.989 11.0615 15.391C10.0909 15.7931 9.05058 16 8 16C6.94943 16 5.90914 15.7931 4.93853 15.391C3.96793 14.989 3.08601 14.3997 2.34315 13.6569C1.60028 12.914 1.011 12.0321 0.608964 11.0615C0.206926 10.0909 0 9.05058 0 8C5.96046e-08 5.87827 0.842855 3.84344 2.34315 2.34315ZM10.947 5.85856C11.2399 6.15145 11.2399 6.62633 10.947 6.91922L7.72477 10.1414C7.43188 10.4343 6.95701 10.4343 6.66411 10.1414L5.053 8.53033C4.76011 8.23744 4.76011 7.76256 5.053 7.46967C5.3459 7.17678 5.82077 7.17678 6.11366 7.46967L7.19444 8.55045L9.88634 5.85856C10.1792 5.56567 10.6541 5.56567 10.947 5.85856Z"
                                    fill="currentColor"></path>
                            </svg>
                            <span class="fw-semibold">${item.title}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2"
                                stroke="currentColor" style="width: 18px; color: grey;">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z">
                                </path>
                            </svg>
                        </div>
                        <div class="ms-3 text-secondary">${item.uptime}</div>
                    </div>
                   <div style="display:flex;" >
    ${item.data.map((status, index) => `
        <div 
            key=${index + 1}
            style="
            margin: 0 2px;
                border-radius: 10px; 
                width: 7px; 
                height: 17px; 
                background-color: ${status ? 'green' : 'grey'}; 
                overflow: hidden;
                flex-shrink: 0;
                flex-basic:7px;
                flex-grow:7px;
                box-sizing:border-box; 
                min-width:7px;
                max-width:7px;
            "
            onmouseover="this.style.backgroundColor='lightgreen'" 
            onmouseout="this.style.backgroundColor='${status ? 'green' : 'grey'}'"
        ></div>`).join('')}
</div>
                </div>
            `;
            // Append the status HTML to the container
            statusContainer.innerHTML += statusHTML;
        })
    })
    .catch(err => console.log('Fetch error: ', err));
