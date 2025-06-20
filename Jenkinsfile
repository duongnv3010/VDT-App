pipeline {
  agent any
  environment {
    GIT_CRED        = 'github-creds'
    DOCKER_CRED     = 'dockerhub-creds'
    DOCKER_NS       = 'duong3010'
    CHART_REPO      = 'https://github.com/duongnv3010/myapp.git'
    CONFIG_REPO     = 'https://github.com/duongnv3010/myapp-config.git'
    CONFIG_BRANCH   = 'main'
  }
  stages {
    stage('Init') {
      steps {
        script {
          // Chỉ chạy trên tag, multibranch sẽ để BRANCH_NAME = tags/v1.2.3
          if (!env.BRANCH_NAME?.startsWith('tags/')) {
            error "This pipeline only runs on tags. Current BRANCH_NAME=${env.BRANCH_NAME}"
          }
          TAG = env.BRANCH_NAME.split('/')[1]
          echo "→ Detected tag: ${TAG}"
        }
      }
    }

    stage('Checkout Code') {
      steps {
        // Checkout đúng tag
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
        script {
          docker.withRegistry('', DOCKER_CRED) {
            // Frontend
            def fe = docker.build("${DOCKER_NS}/fe-image:${TAG}", "frontend")
            fe.push()
            // Backend
            def be = docker.build("${DOCKER_NS}/be-image:${TAG}", "backend")
            be.push()
          }
        }
      }
    }

    stage('Update values.yaml') {
      steps {
        dir('config') {
          // 1. Clone config repo
          git url: CONFIG_REPO, branch: CONFIG_BRANCH, credentialsId: GIT_CRED

          // 2. Cập nhật tag cho cả frontend & backend
          sh """
            yq e '.frontend.image.tag = strenv(TAG)' -i values.yaml
            yq e '.backend.image.tag  = strenv(TAG)' -i values.yaml
          """
        }
      }
    }

    stage('Render Manifests & Commit') {
      steps {
        script {
          // 3. Clone chart repo
          dir('chart') {
            git url: CHART_REPO, credentialsId: GIT_CRED
          }

          // 4. Sinh manifests vào config/manifests
          sh """
            mkdir -p config/manifests
            helm template vdt-app chart/ \\
              --values config/values.yaml \\
              --output-dir config/manifests
          """

          // 5. Commit & push config repo
          dir('config') {
            sh 'git add values.yaml manifests/'
            sh "git commit -m 'CI: bump images to ${TAG} & render manifests'"
            sh "git push origin ${CONFIG_BRANCH}"
          }
        }
      }
    }
  }

  post {
    success {
      echo "✅ Build & Deploy pipeline succeeded for tag=${TAG}"
    }
    failure {
      echo "❌ Pipeline failed!"
    }
  }
}
