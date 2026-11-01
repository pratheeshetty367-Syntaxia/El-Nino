import { ErrorBox, Loading, PageHeader } from "../components/States.jsx";
import useFetch from "../hooks/useFetch.js";
 
export default function Methodology() {
  const { data, error, loading, reload } = useFetch("/api/research/published");
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  const { paper, dataset, predictors } = data;
 
  return (
    <>
      <PageHeader title="Research methodology" subtitle={paper.title} />
      <article className="prose">
        <section className="card">
          <h2>Overview</h2>
          <p>
            Predictor data are collected and preprocessed, labelled using the DJF Niño3.4 anomaly, converted into
            lead-time datasets, used to train XGBoost models evaluated with Leave-One-Out Cross-Validation (LOOCV), and
            finally explained with SHAP to rank predictor importance.
          </p>
          <ol className="workflow">
            {[
              "Dataset collection",
              "Data preprocessing",
              "Target label creation",
              "Lead-time dataset generation",
              "XGBoost model training",
              "LOOCV evaluation",
              "SHAP explainability",
              "Results and predictor ranking",
            ].map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
 
        <section className="card">
          <h2>Dataset collection</h2>
          <p>
            All data come from NOAA and cover {dataset.period}, giving {dataset.records} monthly records. The period starts
            in 1980 because the GODAS dataset used for OHC is available only from that year.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Predictor</th>
                  <th scope="col">Source</th>
                  <th scope="col">Region / domain</th>
                  <th scope="col">Represents</th>
                </tr>
              </thead>
              <tbody>
                {predictors.map((p) => (
                  <tr key={p.key}>
                    <th scope="row">{p.name}</th>
                    <td>{p.source}</td>
                    <td>{p.region}</td>
                    <td>{p.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
 
        <section className="card">
          <h2>Data preprocessing</h2>
          <p>
            Monthly anomalies for SST, OHC and wind were computed by subtracting the 1991–2020 monthly climatology. The IOD
            and Tropical Atlantic SST indices are already published as anomalies by NOAA. The five series were merged into
            one master dataset with the columns Year, Month, sst_anom, ohc_anom, iod_dmi, wind_anom, atl_sst_anom,
            nino34_anom and Target. No missing values remained.
          </p>
        </section>
 
        <section className="card">
          <h2>Target label creation</h2>
          <p>
            A three-month rolling average of the Niño3.4 anomaly was computed for the December–January–February (DJF)
            season. The label is assigned to the January row of each season.
          </p>
          <ul>
            <li>Extreme El Niño: anomaly {dataset.thresholds.extreme}</li>
            <li>Normal El Niño: anomaly {dataset.thresholds.normal}</li>
            <li>Non-Niño: anomaly {dataset.thresholds.non_nino}</li>
          </ul>
          <p>
            This produced {dataset.seasons} labelled seasons ({dataset.class_distribution["Non-Niño"]} Non-Niño,{" "}
            {dataset.class_distribution["Normal El Niño"]} Normal El Niño, {dataset.class_distribution["Extreme El Niño"]}{" "}
            Extreme El Niño). The events {dataset.extreme_events.join(", ")} were all labelled Extreme without manual
            override.
          </p>
        </section>
 
        <section className="card">
          <h2>Lead-time dataset generation</h2>
          <p>
            For a lead time L, each January's five predictor values are taken from L months earlier and paired with that
            season's label. For example, predicting DJF 2016 at a 6-month lead uses July 2015. Four datasets (3, 6, 9 and 12
            months) of 45 samples each were created.
          </p>
        </section>
 
        <section className="card">
          <h2>Model training and class imbalance</h2>
          <p>
            An XGBoost classifier with 100 estimators, maximum depth 3, learning rate 0.1 and objective{" "}
            <code>multi:softprob</code> was trained separately for each lead time. Sample weights compensate for the
            imbalance (a model could reach 67% accuracy by always predicting Non-Niño):
          </p>
          <p className="equation" role="math" aria-label="w sub i equals N divided by K times N sub k">
            w<sub>i</sub> = N / (K · N<sub>k</sub>)
          </p>
          <p>where N is the number of samples, K the number of classes and N<sub>k</sub> the number of samples in class k.</p>
        </section>
 
        <section className="card">
          <h2>Evaluation: Leave-One-Out Cross-Validation</h2>
          <p>
            With only 45 labelled seasons a normal train–test split leaves too few test samples. In each of 45 iterations
            the model is trained on 44 seasons and tested on the remaining one, so every season is tested exactly once.
          </p>
        </section>
 
        <section className="card">
          <h2>SHAP explainability</h2>
          <p>
            A final model per lead time is trained on all 45 seasons and explained with SHAP TreeExplainer, which computes
            exact Shapley values for tree models. Predictor importance is the mean absolute SHAP value over all seasons and
            all three classes:
          </p>
          <p className="equation" role="math" aria-label="mean absolute SHAP for predictor j">
            φ̄<sub>j</sub> = 1 / (N · K) · Σ<sub>i=1..N</sub> Σ<sub>k=1..K</sub> |φ<sub>ij</sub>
            <sup>(k)</sup>|
          </p>
        </section>
 
        <section className="card">
          <h2>Software environment (as reported)</h2>
          <p>
            Python 3.12; pandas and NumPy for data preparation; XGBoost 3.3.0 and scikit-learn 1.9.0 for modelling; SHAP
            0.52.0 for explanations; Matplotlib 3.10 for the paper's figures.
          </p>
        </section>
      </article>
    </>
  );
}

