pipeline {
  agent any
  options { skipDefaultCheckout(); timestamps() }
  environment {
    GIT_CRED      = 'github-creds'
    CHART_REPO    = 'https://github.com/duongnv3010/myapp.git'
    CONFIG_REPO   = 'https://github.com/duongnv3010/myapp-config.git'
    CONFIG_BRANCH = 'master'
    DOCKER_NS     = 'duong3010'
    TAG           = "${BRANCH_NAME}"
  }

  stages {
    stage('Checkout Code') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: "refs/tags/${TAG}"]],
          userRemoteConfigs: [[
            url: 'https://github.com/duongnv3010/VDT-App.git',
            credentialsId: "${GIT_CRED}"
          ]]
        ])
      }
    }

    stage('Build & Push Images') {
      steps {
        withCredentials([usernamePassword(
            credentialsId: 'dockerhub-creds',
            usernameVariable: 'DOCKER_USER',
            passwordVariable: 'DOCKER_PASS'
        )]) {
          sh """
            echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

            docker build -t ${DOCKER_NS}/fe-image:${TAG} frontend
            docker push ${DOCKER_NS}/fe-image:${TAG}

            docker build -t ${DOCKER_NS}/be-image:${TAG} backend
            docker push ${DOCKER_NS}/be-image:${TAG}
          """
        }
      }
    }

    stage('Update values.yaml') {
      steps {
        dir('config') {
          git url: CONFIG_REPO, branch: CONFIG_BRANCH, credentialsId: GIT_CRED
          sh """
            yq e '.frontend.image.tag = strenv(TAG)' -i values.yaml
            yq e '.backend.image.tag  = strenv(TAG)' -i values.yaml
          """
        }
      }
    }

    stage('Render Manifests & Commit') {
      steps {
        dir('chart') {
          git url: CHART_REPO, credentialsId: GIT_CRED
        }
        sh """
          mkdir -p config/manifests
          helm template vdt-app chart/ \\
            --values config/values.yaml \\
            --output-dir config/manifests
        """
        dir('config') {
          sh 'git add values.yaml manifests/'
          sh "git commit -m 'CI: bump images to ${TAG} & render manifests'"
          sh "git push origin ${CONFIG_BRANCH}"
        }
      }
    }
  }

  post {
    success { echo "✅ Pipeline thành công cho tag=${TAG}" }
    failure { echo "❌ Pipeline thất bại cho tag=${TAG}" }
  }
}
