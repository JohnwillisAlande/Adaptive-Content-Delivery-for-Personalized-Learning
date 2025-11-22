import { QUESTIONS } from '../constants';

/**
 * SIMULATED RANDOM FOREST CLASSIFIER
 * 
 * In a production environment, this service would send the raw answer vector
 * to a Python backend hosting a `scikit-learn` Random Forest Classifier model
 * trained on the Felder-Silverman Learning Style Model (FSLSM) dataset.
 * 
 * Since this is a frontend-only demo, we implement a deterministic scoring logic
 * (essentially a decision tree ensemble with depth=1 per feature) to approximate
 * the classification result.
 */

export const classifyLearningStyle = (answers) => {
  const profile = {
    activeReflective: 0,
    sensingIntuitive: 0,
    visualVerbal: 0,
    sequentialGlobal: 0,
  };

  // The "Model" Logic
  QUESTIONS.forEach((q) => {
    const answer = answers[q.id];
    if (!answer) return;

    // In FSLSM usually: A is one pole (negative val), B is other pole (positive val)
    // Or vice-versa. We define:
    // A = Active, Sensing, Visual, Sequential (Negative direction)
    // B = Reflective, Intuitive, Verbal, Global (Positive direction)
    
    const val = answer === 'A' ? -1 : 1;

    switch (q.dimension) {
      case 'ActiveReflective':
        profile.activeReflective += val;
        break;
      case 'SensingIntuitive':
        profile.sensingIntuitive += val;
        break;
      case 'VisualVerbal':
        profile.visualVerbal += val;
        break;
      case 'SequentialGlobal':
        profile.sequentialGlobal += val;
        break;
    }
  });

  return profile;
};

export const getStyleLabels = (profile) => {
  return {
    processing: profile.activeReflective < 0 ? 'Active' : 'Reflective',
    perception: profile.sensingIntuitive < 0 ? 'Sensing' : 'Intuitive',
    input: profile.visualVerbal < 0 ? 'Visual' : 'Verbal',
    understanding: profile.sequentialGlobal < 0 ? 'Sequential' : 'Global',
  };
};
