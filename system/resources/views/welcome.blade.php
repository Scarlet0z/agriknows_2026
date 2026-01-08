<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
   <!-- <script src="/js/login.js" defer type="module"></script> -->
    <title>ArgiKnows Homepage</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="{{ asset('css/home.css') }}">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

</head>

<body>

    </script>
    <script type="text/javascript"
        src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
    <div class="container">


        <header>
            <div class="header-left">
                <img src="{{ asset('images/LOGO.png') }}" class="agri-logo" alt="AgriKnows Logo">
                <h1>AGRIKNOWS</h1>
            </div>

            <div class="header-right">
                <div class="header-right">
                <span id="username-display">
                    {{ session('user.username', 'Guest') }}
                </span>
                <img src="{{ asset('images/profile.png') }}" class="user-profile" alt="User Profile"
                    onclick="window.location.href='{{ url('/user-setting') }}'">
            </div>
        </header>
        <!-----------------------------------CROP MANAGEMENT------------------------------------>
        <div class="main-content">
            <section class="crop-management">
                <section class="crop-selector">
                    <div id="current-date"></div>
                    <div class="form-group">
                        <h2><i class="fas fa-seedling"></i> Crop Management</h2>
                        <div class="crop-controls">
                            <button class="select-crop" id="selectCropBtn"><i class="fas fa-seedling"></i> Pumili ng
                                Pananim</button>
                            <button class="select-crop" id="addCropBtn"><i class="fas fa-plus-circle"></i> Mag Dagdag ng
                                Pananim</button>

                            <div class="pump-control">
                                <label for="pump-switch"><i class="fas fa-faucet reading-icon pump"></i>Patubig</label>
                                <label class="switch"><input type="checkbox" id="pump-switch"><span
                                        class="slider round"></span></label>
                            </div>
                        </div>

                    </div>
                </section>

                <div class="current-crop">
                    <div class="crop-info">
                        <div class="crop-details">
                            <h3 id="currentCropName"><i class="fas fa-seedling"></i>Walang naka piling crop</h3>
                            <p id="currentCropOptimal">Pumili ng crop Para bantayan</p>
                        </div>
                        <div class="moisture-status" id="soil-moisture-status">
                            <p>Pakabasa ng lupa:
                                <b>pinakamainam</b>
                            </p>
                        </div>
                    </div>

            </section>

            <!----------------------------------------notification--------------------------------------->
            <section class="notif">
                <div id="popup" class="popup hidden">
                    <div class="popup-header">
                        <img src="{{ asset('images/warning.png') }}" alt="warning">
                        <h3>BABALA!</h3>
                    </div>
                    <p id="popup-text">
                        <!-- Text will be changed by JS -->
                    </p>
                    <button id="popup-btn">Okay</button>
                </div>
                <div id="overlay" class="overlay hidden"></div>
            </section>
            <!---------------------------------------LOOB NG CHOOSE CROP BUTTON------------------------------------>
            <div class="modal" id="selectCropModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Pag-pili ng Pananim</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <p> Pumili ng isang pananim upang itakda ang pinakamainam na kondisyon. Maaaring i-edit ang mga
                        pasadyang pananim.</p>
                    <div class="crop-grid">
                        <div class="crop-option" data-crop="corn">
                            <i class="fas fa-seedling crop-icon-small"></i>
                            <div class="crop-name-small">Corn</div>
                        </div>
                        <div class="crop-option" data-crop="rice">
                            <i class="fas fa-seedling crop-icon-small"></i>
                            <div class="crop-name-small">Rice</div>
                        </div>
                        <div class="crop-option" data-crop="eggplant">
                            <i class="fas fa-seedling crop-icon-small"></i>
                            <div class="crop-name-small">Eggplant</div>
                        </div>
                        <div class="crop-option" data-crop="tomato">
                            <i class="fas fa-seedling crop-icon-small"></i>
                            <div class="crop-name-small">Tomato</div>
                        </div>
                        <div class="crop-option" data-crop="onion">
                            <i class="fas fa-seedling crop-icon-small"></i>
                            <div class="crop-name-small">Onion</div>
                        </div>
                    </div>
                    <button id="confirmCropBtn" class="btn-confirm" style="width: 100%; margin-top: 20px;">
                        <i class="fas fa-check"></i> Kumpirmahin
                    </button>
                </div>
            </div>
            <!---------------------------------------LOOB NG ADD CROP BUTTON------------------------------------>
            <div class="modal" id="addCropModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Mag Dagdag ng Custom Crop</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="addCropForm">
                        <div class="form-group">
                            <label class="form-label" for="customCropName">Pangalan ng Pananim</label>
                            <input type="text" id="customCropName" class="form-input" placeholder="Enter crop name"
                                required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng Temperatura
                                (°C)</label>
                            <div class="range-inputs">
                                <input type="number" id="tempMin" class="form-input range-input" placeholder="Min"
                                    required>
                                <input type="number" id="tempMax" class="form-input range-input" placeholder="Max"
                                    required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng pagkabasa ng lupa
                                (%)</label>
                            <div class="range-inputs">
                                <input type="number" id="moistureMin" class="form-input range-input" placeholder="Min"
                                    required>
                                <input type="number" id="moistureMax" class="form-input range-input" placeholder="Max"
                                    required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng pH</label>
                            <div class="range-inputs">
                                <input type="number" step="0.1" id="phMin" class="form-input range-input"
                                    placeholder="Min" required>
                                <input type="number" step="0.1" id="phMax" class="form-input range-input"
                                    placeholder="Max" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng Halumigmig
                                (%)</label>
                            <div class="range-inputs">
                                <input type="number" id="humidityMin" class="form-input range-input" placeholder="Min"
                                    required>
                                <input type="number" id="humidityMax" class="form-input range-input" placeholder="Max"
                                    required>
                            </div>
                        </div>

                        <button type="submit" class="btn-add" style="width: 100%; margin-top: 10px;">
                            <i class="fas fa-check" id=""></i>Kumpirmahin
                        </button>
                    </form>
                </div>
            </div>
            <!---------------------------------------LOOB NG CHOOSE CROP BUTTON TO EDIT------------------------------------>
            <div class="modal" id="editDeleteCropModal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="editDeleteCropTitle">Edit Crop: Pangalan ng Pananim</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <form id="editCropForm">
                        <input type="hidden" id="editCropKey">
                        <div class="form-group">
                            <label class="form-label" for="editCustomCropName">Pangalan ng Pananim</label>
                            <input type="text" id="editCustomCropName" class="form-input" placeholder="Enter crop name"
                                required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng Temperatura</label>
                            <div class="range-inputs">
                                <input type="number" id="editTempMin" class="form-input range-input" placeholder="Min"
                                    required>
                                <input type="number" id="editTempMax" class="form-input range-input" placeholder="Max"
                                    required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng Pagkabasa ng luba</label>
                            <div class="range-inputs">
                                <input type="number" id="editMoistureMin" class="form-input range-input"
                                    placeholder="Min" required>
                                <input type="number" id="editMoistureMax" class="form-input range-input"
                                    placeholder="Max" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng pH</label>
                            <div class="range-inputs">
                                <input type="number" step="0.1" id="editPhMin" class="form-input range-input"
                                    placeholder="Min" required>
                                <input type="number" step="0.1" id="editPhMax" class="form-input range-input"
                                    placeholder="Max" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saklaw ng Halumigmig</label>
                            <div class="range-inputs">
                                <input type="number" id="editHumidityMin" class="form-input range-input"
                                    placeholder="Min" required>
                                <input type="number" id="editHumidityMax" class="form-input range-input"
                                    placeholder="Max" required>
                            </div>
                        </div>

                        <button type="submit" class="btn-confirm" style="width: 100%; margin-top: 10px;">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </form>
                    <button id="deleteCropBtn" class="btn-delete" style="width: 100%; margin-top: 10px;">
                        <i class="fas fa-trash"></i> Burahin
                    </button>
                </div>
            </div>
            <!---------------------------------------CURRENT STATUS/ Kasalukuyang Status------------------------------------>

            <section class="current-status">
                <h2><i class="fas fa-chart-line"></i> Kasalukuyang Status</h2>
                <div class="current-status-grid">

                    <div class="reading-card">
                        <div class="reading-header">
                            <i class="fas fa-thermometer-half reading-icon temperature"></i>
                            <h3>Temperatura</h3>
                        </div>
                        <div class="value" id="current-temperature">-- °C</div>
                        <div id="status-temp-text" class="status-message">Loading...</div>
                        <div class="optimal" id="tempOptimal">Optimal: --</div>
                    </div>

                    <div class="reading-card">
                        <div class="reading-header">
                            <i class="fas fa-tint reading-icon moisture"></i>
                            <h3>Pagkabasa ng Lupa</h3>
                        </div>
                        <div class="value" id="current-soil-moisture">-- %</div>
                        <div id="status-moisture-text" class="status-message">Loading...</div>
                        <div class="optimal" id="moistureOptimal">Optimal: --</div>
                    </div>

                    <div class="reading-card">
                        <div class="reading-header">
                            <i class="fas fa-flask reading-icon ph"></i>
                            <h3>Antas ng pH</h3>
                        </div>
                        <div class="value" id="current-ph-level">-- pH</div>
                        <div id="status-ph-text" class="status-message">Loading...</div>
                        <div class="optimal" id="phOptimal">Optimal: --</div>
                    </div>

                    <div class="reading-card">
                        <div class="reading-header">
                            <i class="fas fa-cloud reading-icon humidity"></i>
                            <h3>Halumigmig</h3>
                        </div>
                        <div class="value" id="current-humidity">--%</div>
                        <div id="status-humidity-text" class="status-message">Loading...</div>
                        <div class="optimal" id="humidityOptimal">Optimal: --</div>
                    </div>

                    <div class="reading-card">
                        <div class="reading-header">
                            <i class="fas fa-sun reading-icon light"></i>
                            <h3>Light Status</h3>
                        </div>
                        <div class="value" id="light-status">--</div>
                        <div id="status-light-text" class="status-message">Loading...</div>
                    </div>

                </div>
            </section>
            <!---------------------------------------DATA HISTORY------------------------------------>
            <section class="data-history">
                <div class="history-header">
                    <h2><i class="fas fa-history"></i> Data History</h2>
                    <div class="history-controls">
                        <div class="time-filters">
                            <button class="time-filter active" data-time="1h">1 Hour</button>
                            <button class="time-filter" data-time="6h">6 Hours</button>
                            <button class="time-filter" data-time="24h">24 Hours</button>
                            <button class="time-filter" data-time="7d">7 Days</button>
                        </div>

                        <div class="history-actions">
                            <button id="export-button" class="export-btn">
                                <i class="fas fa-file-csv"></i> Export Data
                            </button>
                            <button id="graph-mode-toggle" class="graph-mode-btn">
                                <i class="fas fa-chart-bar"></i> Graph Mode
                            </button>
                        </div>
                    </div>
                </div>

                <div id="history-table" class="history-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Araw at Oras</th>
                                <th>Pagkabasa ng Lupa</th>
                                <th>Halumigmig</th>
                                <th>Temperatura</th>
                                <th>Light Status</th>
                                <th>Antas ng pH</th>
                            </tr>
                        </thead>
                        <tbody id="history-data">
                        </tbody>
                    </table>
                </div>

                <div id="history-graph" class="history-graph hidden">
                    <div class="graph-container">
                        <canvas id="soil-moisture-chart"></canvas>
                    </div>
                    <div class="graph-container">
                        <canvas id="humidity-chart"></canvas>
                    </div>
                    <div class="graph-container">
                        <canvas id="temperature-chart"></canvas>
                    </div>
                    <div class="graph-container">
                        <canvas id="ph-level-chart"></canvas>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <script type="module" src="{{ asset('js/home.js') }}"></script>
    <footer>
        <p>© 2025 AgriKnows. All rights reserved.</p>
    </footer>
</body>

</html>