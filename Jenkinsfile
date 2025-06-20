pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        FRONTEND_REPO = "duong3010/fe-image"
        BACKEND_REPO = "duong3010/be-image"
        CONFIG_REPO = "https://github.com/duongnv3010/myapp-config.git"
        CONFIG_BRANCH = "master"
        GIT_CREDENTIALS_ID = "github-creds"
        DOCKER_CREDENTIALS_ID = "docker-hub-creds"
    }

    stages {
        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Determine Changes') {
            steps {
                script {
                    env.FRONTEND_CHANGED = sh(script: "git diff --name-only HEAD~1 HEAD | grep '^frontend/' || true", returnStdout: true).trim()
                    env.BACKEND_CHANGED = sh(script: "git diff --name-only HEAD~1 HEAD | grep '^backend/' || true", returnStdout: true).trim()
                }
            }
        }

        stage('Build and Push Frontend') {
            when {
                expression { env.FRONTEND_CHANGED != '' }
            }
            steps {
                dir('frontend') {
                    script {
                        sh "docker build -t ${FRONTEND_REPO}:${env.TAG_NAME} ."
                        withCredentials([usernamePassword(credentialsId: DOCKER_CREDENTIALS_ID, usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh """
                            echo $PASS | docker login -u $USER --password-stdin ${DOCKER_REGISTRY}
                            docker push ${FRONTEND_REPO}:${env.TAG_NAME}
                            docker logout
                            """
                        }
                    }
                }
            }
        }

        stage('Build and Push Backend') {
            when {
                expression { env.BACKEND_CHANGED != '' }
            }
            steps {
                dir('backend') {
                    script {
                        sh "docker build -t ${BACKEND_REPO}:${env.TAG_NAME} ."
                        withCredentials([usernamePassword(credentialsId: DOCKER_CREDENTIALS_ID, usernameVariable: 'USER', passwordVariable: 'PASS')]) {
                            sh """
                            echo $PASS | docker login -u $USER --password-stdin ${DOCKER_REGISTRY}
                            docker push ${BACKEND_REPO}:${env.TAG_NAME}
                            docker logout
                            """
                        }
                    }
                }
            }
        }

        stage('Update Helm values.yaml') {
            steps {
                script {
                    sh """
                    git clone ${CONFIG_REPO} config-repo
                    cd config-repo
                    git checkout ${CONFIG_BRANCH}
                    """
                    if(env.FRONTEND_CHANGED != '') {
                        sh """
                        sed -i 's|frontendTag:.*|frontendTag: ${TAG_NAME}|g' config-repo/values.yaml
                        """
                    }
                    if(env.BACKEND_CHANGED != '') {
                        sh """
                        sed -i 's|backendTag:.*|backendTag: ${TAG_NAME}|g' config-repo/values.yaml
                        """
                    }
                    sh """
                    cd config-repo
                    git config user.email "nguyenduong20053010@gmail.com"
                    git config user.name "duongnv3010"
                    git add values.yaml
                    git commit -m "Update image tag to ${TAG_NAME}"
                    git push https://${GITHUB_TOKEN}@github.com/duongnv3010/myapp-config.git ${CONFIG_BRANCH}
                    """
                }
            }
        }
    }
}
